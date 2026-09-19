// Assembles a finished character folder as a set of named files, ready to zip.

import type { CharacterDef, CameraRig, EmoteDef } from "../model/project";
import { serializeCharIni } from "./charIni";
import { serializeCameraRig } from "./cameraJson";

export interface CharFile {
  path: string;
  data: Uint8Array;
}

const encoder = new TextEncoder();

/**
 * Builds the character folder contents. `assets` are the model, textures and
 * VMD files already named relative to the character root (the UI places each
 * motion at its `emoteLoopPath`/`emotePreanimPath` before calling this).
 */
export function buildCharacterFolder(opts: {
  character: CharacterDef;
  emotes: EmoteDef[];
  cameraRig: CameraRig;
  assets: CharFile[];
}): CharFile[] {
  const out: CharFile[] = [
    { path: "char.ini", data: encoder.encode(serializeCharIni(opts.character, opts.emotes)) },
    { path: "camera.json", data: encoder.encode(serializeCameraRig(opts.cameraRig)) },
  ];
  for (const asset of opts.assets) out.push(asset);
  return out;
}
