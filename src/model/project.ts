// The AO-Greenroom project model: a non-destructive source of truth that
// serializes to `.greenroom.json`. Binary assets (the .pmx, textures, .vmd
// files) live in memory during a session and are re-supplied on reopen; the
// project JSON stores only metadata + the camera rig + the emote table.

export interface CharacterDef {
  name: string;
  showname: string;
  side: string;
  gender: string;
  blips: string;
  chat: string;
  category: string;
  /** PMX model file, relative to the character root (e.g. "model.pmx"). */
  model: string;
}

export interface EmoteDef {
  /** Stable block name (`[emote <key>]`) — also the default motion stem. */
  key: string;
  /** Display label shown on the emote button (defaults to `key`). */
  name: string;
  /** Base loop motion stem (no ".vmd"). Idle + talking share this motion. */
  anim: string;
  /** Preanim motion stem (no ".vmd"), or null for none. */
  preanim: string | null;
  /** Sound file name with extension (e.g. "objection.opus"), or null. */
  sound: string | null;
  /** Sound delay in milliseconds, or null. */
  soundDelayMs: number | null;
  /** Symbolic desk modifier (e.g. "shown", "hidden"), or null. */
  deskmod: string | null;
  /** Symbolic emote modifier (e.g. "zoom", "preanim"), or null. */
  modifier: string | null;
}

// --- camera.json (mirrors aolib-meta `CameraRig.schema.json`) ---------------

export interface Pose {
  /** Height the camera looks at, as a fraction of character height (0=feet, 1=head). */
  targetY?: number;
  /** Camera distance from the target, in character-heights. */
  distance?: number;
  /** Horizontal orbit in degrees; 0 = head-on, positive = to the character's left. */
  yaw?: number;
  /** Vertical orbit in degrees; 0 = level, positive = looking down. */
  pitch?: number;
  /** Vertical field of view in degrees. */
  fov?: number;
}

export interface Keyframe extends Pose {
  /** Normalized 0..1 across the driving motion (preanim VMD or base loop). */
  t: number;
}

export type CameraEasing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface KeyedClip {
  keys: Keyframe[];
  easing?: CameraEasing;
}

/** A Clip is a static Pose, or an animated KeyedClip (which has `keys`). */
export type Clip = Pose | KeyedClip;

export interface EmoteCamera {
  loop?: Clip;
  preanim?: Clip;
}

export interface CameraRig {
  default?: Clip;
  emotes?: Record<string, EmoteCamera>;
}

// --- motions ----------------------------------------------------------------

export type MotionRole =
  | "idle"
  | "objection"
  | "point"
  | "talk"
  | "walk"
  | "sit"
  | "angry"
  | "preanim"
  | "other";

export interface MotionFile {
  /** File name relative to the character root, e.g. "motions/idle.vmd". */
  file: string;
  /** Stem without ".vmd" or folders. */
  stem: string;
  role: MotionRole;
  /** Measured duration in ms, or null if unknown. */
  durationMs: number | null;
}

export interface GreenroomProject {
  version: 1;
  character: CharacterDef;
  emotes: EmoteDef[];
  cameraRig: CameraRig;
  motions: MotionFile[];
}

// --- factories --------------------------------------------------------------

export function defaultCharacter(): CharacterDef {
  return {
    name: "Character",
    showname: "Character",
    side: "defense",
    gender: "female",
    blips: "female",
    chat: "default",
    category: "default",
    model: "model.pmx",
  };
}

/** A small starter set so a fresh project already has something usable. */
export function defaultEmotes(): EmoteDef[] {
  const mk = (key: string, name = key): EmoteDef => ({
    key,
    name,
    anim: key,
    preanim: null,
    sound: null,
    soundDelayMs: null,
    deskmod: null,
    modifier: null,
  });
  return [mk("idle"), mk("objection"), mk("point")];
}

export function newProject(): GreenroomProject {
  return {
    version: 1,
    character: defaultCharacter(),
    emotes: defaultEmotes(),
    cameraRig: {},
    motions: [],
  };
}

// --- on-disk naming (matches LemmyAO PR #53 asset resolution) ---------------

/** Base loop VMD for an emote: `<anim>.vmd`. */
export function emoteLoopPath(emote: EmoteDef): string {
  return `${emote.anim}.vmd`;
}

/** Preanim VMD for an emote: `<preanim>.vmd`, or null when there is none. */
export function emotePreanimPath(emote: EmoteDef): string | null {
  return emote.preanim ? `${emote.preanim}.vmd` : null;
}

export function isKeyedClip(clip: Clip): clip is KeyedClip {
  return "keys" in clip;
}

// --- project (de)serialization ---------------------------------------------

export function serializeProject(project: GreenroomProject): string {
  return JSON.stringify(project, null, 2) + "\n";
}

export function parseProject(text: string): GreenroomProject {
  const data = JSON.parse(text) as GreenroomProject;
  if (data.version !== 1) {
    throw new Error(`Unsupported project version: ${String((data as { version?: number }).version)}`);
  }
  return data;
}
