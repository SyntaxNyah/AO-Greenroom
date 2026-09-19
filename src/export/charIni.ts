// Writes the new preferred char.ini encoding from aolib-meta:
//   [options] model = <pmx>   (marks the character as 3D)
//   [emotions] N = <block name>  (button order)
//   [emote <name>] anim/preanim/sound/desk/zoom/desc
//
// See docs/FORMATS.md and the vendored schemas/CharIni.schema.json.

import type { CharacterDef, EmoteDef } from "../model/project";

const esc = (s: string): string => s.replace(/[\r\n]/g, " ").trim();

export function serializeCharIni(character: CharacterDef, emotes: EmoteDef[]): string {
  const lines: string[] = [];

  lines.push("[options]");
  const options: Array<[string, string | number | null]> = [
    ["name", character.name],
    ["showname", character.showname],
    ["side", character.side],
    ["gender", character.gender],
    ["blips", character.blips],
    ["chat", character.chat],
    ["category", character.category],
    ["model", character.model],
  ];
  for (const [key, value] of options) {
    if (value !== null && value !== "") lines.push(`${key} = ${esc(String(value))}`);
  }
  lines.push("");

  // Button order. Block names (not `#`-delimited legacy records).
  lines.push("[emotions]");
  lines.push(`number = ${emotes.length}`);
  emotes.forEach((emote, index) => {
    lines.push(`${index + 1} = ${esc(emote.key)}`);
  });
  lines.push("");

  for (const emote of emotes) {
    lines.push(`[emote ${emote.key}]`);
    lines.push(`anim = ${esc(emote.anim)}.vmd`);
    if (emote.preanim) lines.push(`preanim = ${esc(emote.preanim)}.vmd`);
    if (emote.name && emote.name !== emote.key) lines.push(`desc = ${esc(emote.name)}`);
    if (emote.sound) lines.push(`sound = ${esc(emote.sound)}`);
    if (emote.soundDelayMs !== null && emote.soundDelayMs !== undefined) {
      lines.push(`sounddelayms = ${emote.soundDelayMs}`);
    }
    if (emote.deskmod) lines.push(`deskmod = ${esc(emote.deskmod)}`);
    if (emote.modifier) lines.push(`modifier = ${esc(emote.modifier)}`);
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
