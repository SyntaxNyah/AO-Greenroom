// The interactive Babylon/MMD viewport. Owns one engine/scene and lets the
// rigging UI load a .pmx model, preview .vmd motions, and move an orbit camera
// that maps 1:1 to the height-normalized camera.json Pose format.
//
// Adapted from LemmyAO's `src/viewport/mmd/mmdController.ts` (PR #53) so the
// framing math and asset resolution match what the client does at runtime.

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";

// Side-effect imports: register the PMX loader and the animation runtime.
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import type { MmdRuntimeAnimationHandle } from "babylon-mmd/esm/Runtime/mmdRuntimeAnimationHandle";
import type { Bone } from "@babylonjs/core/Bones/bone";

import type { Pose } from "../model/project";
import { autoFramePose } from "./frameFromSkeleton";
import { buildReferenceFiles, type TextureAsset } from "./referenceFiles";
import { buildRetargetingMap, countBindableBones } from "./boneRetarget";

export interface MotionInfo {
  stem: string;
  durationMs: number;
  /** Motion bone tracks that can bind to the current model (0 = name mismatch). */
  bindableBones: number;
  /** Total bone tracks in the motion. */
  totalBones: number;
}

interface SkeletonLike {
  bones?: Array<{ getAbsolutePosition(): Vector3 }>;
}

const DEFAULT_FOV_DEG = 30;

export class MmdStage {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly runtime: MmdRuntime;
  private readonly vmdLoader: VmdLoader;
  private readonly materialBuilder: MmdStandardMaterialBuilder;

  private model: MmdModel | null = null;
  private mesh: MmdMesh | null = null;
  private handle: MmdRuntimeAnimationHandle | null = null;
  private readonly motions = new Map<string, MmdAnimation>();

  private charHeight = 1;
  private feetY = 0;
  private looping = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { alpha: true, stencil: true }, true);
    SdefInjector.OverrideEngineCreateEffect(this.engine);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 0);

    this.camera = new ArcRotateCamera(
      "rigCamera",
      0,
      Math.PI / 2,
      8,
      new Vector3(0, 1, 0),
      this.scene,
    );
    this.camera.minZ = 0.05;
    this.camera.maxZ = 2000;
    this.camera.fov = (DEFAULT_FOV_DEG * Math.PI) / 180;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.attachControl(canvas, false);

    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const key = new DirectionalLight("key", new Vector3(0.4, -0.6, 0.6), this.scene);
    key.position = new Vector3(5, 8, 5);

    this.materialBuilder = new MmdStandardMaterialBuilder();
    this.runtime = new MmdRuntime(this.scene);
    // Required: hook the runtime's beforePhysics/afterPhysics stages into the
    // scene render loop. Without this, MmdModel.worldTransformMatrices is never
    // populated and the model's vertices all collapse to the origin (invisible).
    this.runtime.register(this.scene);
    this.runtime.loggingEnabled = true;
    this.vmdLoader = new VmdLoader(this.scene);

    // Restart the base loop from 0 when it reaches the end (one-shots hold).
    this.runtime.onPauseAnimationObservable.add(() => {
      if (!this.looping) return;
      const duration = this.runtime.animationFrameTimeDuration;
      if (duration > 0 && this.runtime.currentFrameTime >= duration - 1e-3) {
        this.runtime.seekAnimation(0, true);
        this.runtime.playAnimation();
      }
    });

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  get ready(): boolean {
    return this.model !== null;
  }

  async loadModel(file: File, textures: TextureAsset[] = []): Promise<void> {
    const referenceFiles = await buildReferenceFiles(textures);
    const result = await ImportMeshAsync(file, this.scene, {
      pluginOptions: {
        mmdmodel: {
          materialBuilder: this.materialBuilder,
          loggingEnabled: true,
          // Provide the dropped textures so relative paths resolve. Pass the
          // File itself (not a blob URL) so Babylon can pick the .pmx plugin
          // from the filename extension — a blob URL has none.
          referenceFiles: referenceFiles as unknown as File[],
        },
      },
    });

    const mesh = result.meshes[0] as MmdMesh | undefined;
    if (!mesh) throw new Error("No mesh found in the model file.");
    console.log(`[mmd] model loaded: ${result.meshes.length} meshes, ${result.skeletons?.[0]?.bones.length ?? 0} bones, ${referenceFiles.length} reference files`);

    // Measure the rest-pose skeleton before the runtime disables standard
    // bone world-matrix updates (see the MmdModel docs).
    const extent = this.measureExtent(result.skeletons?.[0] as SkeletonLike | undefined, mesh);
    this.charHeight = Math.max(extent.maxY - extent.minY, 1e-3);

    this.disposeModel();
    this.mesh = mesh;
    this.model = this.runtime.createMmdModel(mesh);

    this.feetY = 0;
    // Shift feet to the origin so height-normalized poses map cleanly.
    mesh.position.y += -extent.minY;

    this.applyPose(this.autoFrame());
  }

  async loadMotion(file: File): Promise<MotionInfo> {
    const url = URL.createObjectURL(file);
    const stem = file.name.replace(/\.vmd$/i, "");
    try {
      const anim = await this.vmdLoader.loadAsync(url, url);
      this.motions.set(stem, anim);
      const durationMs = (anim.endFrame / 30) * 1000;
      const animationBoneNames = this.animationBoneNames(anim);
      const binding = this.model
        ? countBindableBones(this.modelBoneNames(), animationBoneNames)
        : { matched: -1, total: animationBoneNames.length, retargeted: 0 };
      return {
        stem,
        durationMs,
        bindableBones: binding.matched,
        totalBones: binding.total,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async playMotion(stem: string, loop: boolean): Promise<void> {
    const anim = this.motions.get(stem);
    if (!anim) {
      console.log(`[mmd] playMotion skipped: no motion "${stem}"`);
      return;
    }
    if (!this.model) {
      console.log("[mmd] playMotion skipped: no model");
      return;
    }
    if (this.handle) {
      this.model.destroyRuntimeAnimation(this.handle);
    }

    const modelBoneNames = this.modelBoneNames();
    const animationBoneNames = this.animationBoneNames(anim);
    const retargetingMap = buildRetargetingMap(modelBoneNames, animationBoneNames);
    const { matched, total, retargeted } = countBindableBones(modelBoneNames, animationBoneNames);

    // Retarget standard Japanese MMD bone names to the model's (often English)
    // names when they don't match directly, so humanoid VMDs can drive models
    // exported with English bone names.
    this.handle = this.model.createRuntimeAnimation(
      anim,
      Object.keys(retargetingMap).length > 0 ? retargetingMap : undefined,
    );
    this.model.setRuntimeAnimation(this.handle);
    this.looping = loop;
    await this.runtime.seekAnimation(0, true);
    this.runtime.playAnimation();
    console.log(
      `[mmd] playing "${stem}" (loop=${loop}) [${matched}/${total} bones bindable, ${retargeted} retargeted]`,
    );
  }

  private modelBoneNames(): string[] {
    return this.model?.skeleton.bones.map((b) => b.name) ?? [];
  }

  private animationBoneNames(anim: MmdAnimation): string[] {
    return [
      ...anim.boneTracks.map((t) => t.name),
      ...anim.movableBoneTracks.map((t) => t.name),
    ];
  }

  /** Stops motion playback and returns the model to a neutral pose. */
  stopMotion(): void {
    this.looping = false;
    if (this.handle && this.model) {
      this.model.destroyRuntimeAnimation(this.handle);
      this.handle = null;
    }
    this.runtime.pauseAnimation();
  }

  /**
   * Dumps the model's bone coordinates and the loaded motions' track
   * coordinates. Used to diagnose retarget / coordinate-convention mismatches
   * (e.g. a model whose bone rest-orientations aren't the standard MMD
   * identity, or a left/right axis flip vs the .vmd).
   */
  diagnostics(): string {
    const lines: string[] = ["=== MMD coordinate dump ==="];

    const skeleton = this.mesh?.skeleton;
    if (skeleton) {
      const bones = skeleton.bones;
      const restMats = bones.map((b) => b.getRestMatrix().clone());
      const parentIndexOf = (b: Bone): number => {
        const p = b.getParent();
        return p ? bones.indexOf(p) : -1;
      };
      lines.push(`MODEL ${bones.length} bones:`);
      bones.forEach((b, i) => {
        const rest = restMats[i]!;
        const pos = `(${MmdStage.fmt(rest.m[12])}, ${MmdStage.fmt(rest.m[13])}, ${MmdStage.fmt(rest.m[14])})`;
        let localRot = "";
        const pi = parentIndexOf(b);
        if (pi >= 0) {
          const local = rest.clone().multiply(restMats[pi]!.clone().invert());
          const q = Quaternion.FromRotationMatrix(local);
          localRot = ` localRot=(${MmdStage.fmt(q.x)}, ${MmdStage.fmt(q.y)}, ${MmdStage.fmt(q.z)}, ${MmdStage.fmt(q.w)})`;
        }
        lines.push(`  ${b.name}: pos=${pos}${localRot}`);
      });
    }

    for (const [stem, anim] of this.motions) {
      lines.push(`MOTION "${stem}" endFrame=${anim.endFrame}:`);
      for (const t of anim.boneTracks) {
        lines.push(
          `  bone ${t.name} frames=${t.frameNumbers.length} rot0=(${MmdStage.fmt(t.rotations[0])}, ${MmdStage.fmt(t.rotations[1])}, ${MmdStage.fmt(t.rotations[2])}, ${MmdStage.fmt(t.rotations[3])})`,
        );
      }
      for (const t of anim.movableBoneTracks) {
        lines.push(
          `  movable ${t.name} frames=${t.frameNumbers.length} pos0=(${MmdStage.fmt(t.positions[0])}, ${MmdStage.fmt(t.positions[1])}, ${MmdStage.fmt(t.positions[2])}) rot0=(${MmdStage.fmt(t.rotations[0])}, ${MmdStage.fmt(t.rotations[1])}, ${MmdStage.fmt(t.rotations[2])}, ${MmdStage.fmt(t.rotations[3])})`,
        );
      }
    }

    return lines.join("\n");
  }

  private static fmt(n: number | undefined): string {
    if (n === undefined) return "?";
    const v = Math.abs(n) < 1e-9 ? 0 : n;
    return v.toFixed(4);
  }

  /** The default resting shot, derived from the skeleton (feet near bottom). */
  autoFrame(): Pose {
    return autoFramePose(DEFAULT_FOV_DEG, 0, this.charHeight);
  }

  /** Applies a height-normalized Pose to the orbit camera. */
  applyPose(pose: Pose): void {
    const targetY = (pose.targetY ?? 0.57) * this.charHeight + this.feetY;
    const distance = Math.max((pose.distance ?? 2.3) * this.charHeight, 0.01);
    this.camera.setTarget(new Vector3(0, targetY, 0));
    this.camera.radius = distance;
    this.camera.alpha = -(pose.yaw ?? 0) * (Math.PI / 180);
    this.camera.beta = Math.PI / 2 - (pose.pitch ?? 0) * (Math.PI / 180);
    if (pose.fov !== undefined) this.camera.fov = pose.fov * (Math.PI / 180);
  }

  /** Reads the current orbit camera as a height-normalized Pose. */
  currentPose(): Pose {
    return {
      targetY: (this.camera.target.y - this.feetY) / this.charHeight,
      distance: this.camera.radius / this.charHeight,
      yaw: -(this.camera.alpha * 180) / Math.PI,
      pitch: (Math.PI / 2 - this.camera.beta) * (180 / Math.PI),
      fov: (this.camera.fov * 180) / Math.PI,
    };
  }

  setOrbit(on: boolean): void {
    if (on) this.camera.attachControl(this.canvas, false);
    else this.camera.detachControl();
  }

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeModel();
    this.scene.dispose();
    this.engine.dispose();
  }

  private disposeModel(): void {
    if (this.model) {
      this.runtime.destroyMmdModel(this.model);
      this.model = null;
    }
    if (this.mesh) {
      this.mesh.dispose(false, true);
      this.mesh = null;
    }
    this.handle = null;
  }

  private measureExtent(
    skeleton: SkeletonLike | undefined,
    mesh: MmdMesh,
  ): { minY: number; maxY: number } {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const bone of skeleton?.bones ?? []) {
      const y = bone.getAbsolutePosition().y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minY) || maxY - minY < 1e-3) {
      const bounds = mesh.getHierarchyBoundingVectors();
      minY = bounds.min.y;
      maxY = bounds.max.y;
    }
    return { minY, maxY };
  }
}

export async function createStage(canvas: HTMLCanvasElement): Promise<MmdStage> {
  return new MmdStage(canvas);
}
