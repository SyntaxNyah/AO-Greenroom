// Serializes a CameraRig to the `camera.json` sidecar format defined by
// aolib-meta `schemas/assets/CameraRig.schema.json`. Undefined/optional fields
// are dropped so the output is a minimal, valid document.

import type {
  CameraRig,
  Clip,
  EmoteCamera,
  Keyframe,
  KeyedClip,
  Pose,
} from "../model/project";
import { isKeyedClip } from "../model/project";

function cleanPose(pose?: Pose): Pose | undefined {
  if (!pose) return undefined;
  const out: Pose = {};
  if (pose.targetY !== undefined) out.targetY = pose.targetY;
  if (pose.distance !== undefined) out.distance = pose.distance;
  if (pose.yaw !== undefined) out.yaw = pose.yaw;
  if (pose.pitch !== undefined) out.pitch = pose.pitch;
  if (pose.fov !== undefined) out.fov = pose.fov;
  return out;
}

function cleanClip(clip?: Clip): Clip | undefined {
  if (!clip) return undefined;
  if (isKeyedClip(clip)) {
    const keys = clip.keys.map((key): Keyframe => {
      const cleaned = cleanPose(key) ?? {};
      return { ...cleaned, t: key.t };
    });
    const out: KeyedClip = { keys };
    if (clip.easing) out.easing = clip.easing;
    return out;
  }
  return cleanPose(clip);
}

export function serializeCameraRig(rig: CameraRig): string {
  const out: CameraRig = {};

  const defaultClip = cleanClip(rig.default);
  if (defaultClip) out.default = defaultClip;

  if (rig.emotes) {
    const emotes: Record<string, EmoteCamera> = {};
    for (const [key, emoteCamera] of Object.entries(rig.emotes)) {
      const cleaned: EmoteCamera = {};
      const loop = cleanClip(emoteCamera.loop);
      const preanim = cleanClip(emoteCamera.preanim);
      if (loop) cleaned.loop = loop;
      if (preanim) cleaned.preanim = preanim;
      if (Object.keys(cleaned).length > 0) emotes[key] = cleaned;
    }
    if (Object.keys(emotes).length > 0) out.emotes = emotes;
  }

  return JSON.stringify(out, null, 2) + "\n";
}

export function parseCameraRig(text: string): CameraRig {
  return JSON.parse(text) as CameraRig;
}
