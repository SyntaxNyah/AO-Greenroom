// Motion discovery heuristics: turn a pile of dropped .vmd filenames into a
// role-guessed library. Pure and unit-testable; duration measurement happens
// in the Babylon stage because it requires actually loading the VMD.

import type { MotionRole } from "../model/project";

const ROLE_PATTERNS: Array<[MotionRole, RegExp]> = [
  ["idle", /(^|[ ._-])(idle|stand|wait|normal)([ ._-]|$)/i],
  ["preanim", /(^|[ ._-])(intro|start|enter|arrive|preanim|pre)([ ._-]|$)/i],
  ["objection", /(objection|slam|bang|desk|pound|table|gavel)/i],
  ["point", /(point|finger|accuse)/i],
  ["talk", /(talk|speak|chat|speech)/i],
  ["walk", /(walk|run|step|move|stride)/i],
  ["sit", /(sit|chair|seat|kneel)/i],
  ["angry", /(angry|rage|mad|shout|yell|furious|scold)/i],
];

/** Strips the ".vmd" extension and any leading folders from a path. */
export function motionStem(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  return base.replace(/\.vmd$/i, "");
}

/** Best-effort role guess from the filename. */
export function guessMotionRole(fileName: string): MotionRole {
  for (const [role, pattern] of ROLE_PATTERNS) {
    if (pattern.test(fileName)) return role;
  }
  return "other";
}
