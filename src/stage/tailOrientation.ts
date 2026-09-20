// Compensates for babylon-mmd applying VMD rotations with an identity rest
// orientation. MMD rotates each bone in its own tail/child-aligned local
// frame; babylon-mmd builds every bone with `Matrix.Identity().setTranslation`
// (its "rest quaternion" handling is commented out), so for off-axis bones
// (e.g. fingers) the rotations are applied around the wrong axis.
//
// The fix pre-multiplies each VMD bone rotation by the bone's rest orientation
// (`rest * animation`), so the result matches MMD.

import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { IMmdRuntimeBone } from "babylon-mmd/esm/Runtime/IMmdRuntimeBone";
import type { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";

// MMD derives the bone's local frame from the tail direction with a fixed
// reference axis; using +Z keeps the frame non-degenerate for vertically
// oriented bones (legs).
const _up = new Vector3(0, 0, 1);

/**
 * Builds the MMD tail frame quaternion from a direction vector: local +X
 * points along the direction, +Y = Z x X, +Z = X x Y. Returns false when the
 * direction is zero or parallel to the reference axis.
 */
export function tailFrameFromDirection(
  direction: Readonly<Vector3>,
  out: Quaternion,
): boolean {
  const x = new Vector3();
  const y = new Vector3();
  const z = new Vector3();
  const mat = new Matrix();

  x.copyFrom(direction);
  if (x.lengthSquared() < 1e-8) return false;
  x.normalize();

  Vector3.CrossToRef(_up, x, y); // Z x X
  if (y.lengthSquared() < 1e-8) return false; // tail parallel to reference axis
  y.normalize();

  Vector3.CrossToRef(x, y, z);
  Matrix.FromXYZAxesToRef(x, y, z, mat);
  Quaternion.FromRotationMatrixToRef(mat, out);
  return true;
}

/**
 * Computes each bone's MMD "tail frame" (rest orientation) from the direction
 * to its first child. Axis-aligned bones (arms/torso/legs) produce ~identity;
 * off-axis bones (fingers) produce a real rotation. Leaf bones are skipped.
 */
export function computeTailFrames(bones: readonly IMmdRuntimeBone[]): Map<string, Quaternion> {
  const frames = new Map<string, Quaternion>();
  const q = new Quaternion();

  for (const bone of bones) {
    const child = bone.childBones[0];
    if (child === undefined) continue;

    // The child's local position is the offset from this bone = the tail
    // direction, expressed in the (identity) parent frame.
    if (tailFrameFromDirection(child.linkedBone.position, q)) {
      frames.set(bone.name, q.clone());
    }
  }
  return frames;
}

/**
 * Pre-multiplies each retargeted bone track's rotations by the corresponding
 * tail frame (`rest * animation`), mutating the animation in place. Returns
 * the number of tracks that were adjusted.
 */
export function applyTailFrames(
  anim: MmdAnimation,
  retargetingMap: Record<string, string>,
  tailFrames: Map<string, Quaternion>,
): number {
  // retargetingMap is keyed modelBone -> animBone; invert it.
  const animToModel = new Map<string, string>();
  for (const [model, animName] of Object.entries(retargetingMap)) {
    animToModel.set(animName, model);
  }

  const q = new Quaternion();
  const rotated = new Quaternion();
  let applied = 0;

  for (const track of anim.boneTracks) {
    const modelName = animToModel.get(track.name);
    if (modelName === undefined) continue;
    const rest = tailFrames.get(modelName);
    if (rest === undefined) continue;

    const rotations = track.rotations;
    for (let i = 0; i < rotations.length; i += 4) {
      q.set(rotations[i]!, rotations[i + 1]!, rotations[i + 2]!, rotations[i + 3]!);
      rest.multiplyToRef(q, rotated); // rest * animation
      rotations[i] = rotated.x;
      rotations[i + 1] = rotated.y;
      rotations[i + 2] = rotated.z;
      rotations[i + 3] = rotated.w;
    }
    applied++;
  }
  return applied;
}
