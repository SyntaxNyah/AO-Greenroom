// Structural validation of a project before export. Keeps the schema's
// constraints (see schemas/CameraRig.schema.json) without pulling in a JSON
// Schema runtime: by construction the exporter emits valid documents, but a
// hand-edited .greenroom.json can violate them, so we check the important
// rules here and surface friendly messages.

import type {
  CameraRig,
  CharacterDef,
  Clip,
  EmoteDef,
  GreenroomProject,
  Pose,
} from "../model/project";
import { isKeyedClip } from "../model/project";

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  message: string;
}

const INI_KEY_RE = /^[A-Za-z0-9_\- ]+$/;

function validateCharacter(character: CharacterDef): Issue[] {
  const issues: Issue[] = [];
  if (!character.name.trim()) {
    issues.push({ severity: "error", message: "Character name is required." });
  }
  if (!character.model.trim()) {
    issues.push({ severity: "error", message: "Model is required for a 3D character." });
  } else if (!/\.pmx$/i.test(character.model.trim())) {
    issues.push({
      severity: "warning",
      message: `Model "${character.model}" does not end in .pmx — 3D mode will not activate.`,
    });
  }
  return issues;
}

function validateEmotes(emotes: EmoteDef[]): Issue[] {
  const issues: Issue[] = [];
  if (emotes.length === 0) {
    issues.push({ severity: "error", message: "At least one emote is required." });
    return issues;
  }
  const seen = new Set<string>();
  for (const emote of emotes) {
    const key = emote.key.trim();
    if (!key) {
      issues.push({ severity: "error", message: "An emote has an empty key." });
    } else if (!INI_KEY_RE.test(key) || key.includes("#") || key.includes(";")) {
      issues.push({
        severity: "error",
        message: `Emote key "${key}" contains characters that are invalid in an INI block name.`,
      });
    } else if (seen.has(key.toLowerCase())) {
      issues.push({ severity: "error", message: `Duplicate emote key "${key}".` });
    }
    seen.add(key.toLowerCase());

    if (!emote.anim.trim()) {
      issues.push({ severity: "error", message: `Emote "${key || "(unnamed)"}" has no motion.` });
    }
    if (emote.preanim && !emote.preanim.trim()) {
      issues.push({ severity: "warning", message: `Emote "${key}" has a blank preanim.` });
    }
  }
  return issues;
}

function validatePose(pose: Pose, label: string): Issue[] {
  const issues: Issue[] = [];
  if (pose.distance !== undefined && pose.distance <= 0) {
    issues.push({ severity: "error", message: `${label}: distance must be > 0.` });
  }
  if (pose.fov !== undefined && (pose.fov <= 0 || pose.fov >= 180)) {
    issues.push({ severity: "error", message: `${label}: fov must be between 0 and 180.` });
  }
  if (pose.targetY !== undefined && (pose.targetY < 0 || pose.targetY > 1)) {
    issues.push({
      severity: "warning",
      message: `${label}: targetY ${pose.targetY} is outside the usual 0..1 range.`,
    });
  }
  return issues;
}

function validateClip(clip: Clip, label: string): Issue[] {
  if (isKeyedClip(clip)) {
    const issues: Issue[] = [];
    if (clip.keys.length === 0) {
      issues.push({ severity: "error", message: `${label}: a keyed clip needs at least one key.` });
    }
    for (const key of clip.keys) {
      if (key.t < 0 || key.t > 1) {
        issues.push({ severity: "error", message: `${label}: keyframe t must be 0..1.` });
      }
      issues.push(...validatePose(key, `${label} key@${key.t}`));
    }
    return issues;
  }
  return validatePose(clip, label);
}

function validateCameraRig(rig: CameraRig, emoteKeys: Set<string>): Issue[] {
  const issues: Issue[] = [];
  if (rig.default) issues.push(...validateClip(rig.default, "camera default"));

  for (const [emote, camera] of Object.entries(rig.emotes ?? {})) {
    if (!emoteKeys.has(emote)) {
      issues.push({
        severity: "warning",
        message: `camera.json has an entry for unknown emote "${emote}".`,
      });
    }
    if (camera.loop) issues.push(...validateClip(camera.loop, `emote "${emote}" loop`));
    if (camera.preanim) {
      issues.push(...validateClip(camera.preanim, `emote "${emote}" preanim`));
    }
  }
  return issues;
}

export function validateProject(project: GreenroomProject): Issue[] {
  const issues: Issue[] = [];
  issues.push(...validateCharacter(project.character));
  issues.push(...validateEmotes(project.emotes));
  issues.push(
    ...validateCameraRig(project.cameraRig, new Set(project.emotes.map((e) => e.key))),
  );
  return issues;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
