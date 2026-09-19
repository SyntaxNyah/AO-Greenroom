// Maps standard MMD (Japanese) humanoid bone names to the English-name
// variants many models use, so a .vmd exported for a Japanese-named model can
// still drive a model whose bones are named in English (e.g. UmaViewer exports
// "Head", "Arm_L", "Thigh_L" instead of 頭, 左腕, 左足). Pure and unit-testable.

interface CanonicalBone {
  /** Japanese MMD bone name used in VMD files. */
  ja: string;
  /** English-name candidates a model might use, most-common first. */
  en: string[];
}

const BONES: CanonicalBone[] = [
  // root / pelvis / torso
  { ja: "センター", en: ["Center", "Position", "Root"] },
  { ja: "グルーブ", en: ["Groove", "Hip", "Pelvis"] },
  { ja: "腰", en: ["Waist", "Koshi"] },
  { ja: "下半身", en: ["LowerBody", "UnderBody"] },
  // UmaViewer maps 上半身 -> "Spine" and 上半身2 -> "Chest" (see its
  // UnityHumanoidVMDRecorder BoneDictionary), so the Uma-derived names come
  // first here even though many generic MMD rigs use "Chest" for 上半身.
  { ja: "上半身", en: ["Spine", "UpperBody", "Chest", "Body"] },
  { ja: "上半身2", en: ["Chest", "UpperBody2", "Spine", "Body2"] },
  { ja: "首", en: ["Neck"] },
  { ja: "頭", en: ["Head"] },

  // left arm
  { ja: "左肩", en: ["Shoulder_L", "LeftShoulder", "L_Shoulder"] },
  { ja: "左腕", en: ["Arm_L", "LeftArm", "L_Arm"] },
  { ja: "左ひじ", en: ["Elbow_L", "LeftElbow", "L_Elbow"] },
  { ja: "左手首", en: ["Wrist_L", "LeftWrist", "L_Wrist"] },
  // left fingers
  // UmaViewer skips the fixed base bone, so 親指１ = Thumb_02 and
  // 親指２ = Thumb_03 (not Thumb_01 / Thumb_02).
  { ja: "左親指１", en: ["Thumb_02_L", "Thumb2_L", "Thumb01_L"] },
  { ja: "左親指２", en: ["Thumb_03_L", "Thumb3_L", "Thumb02_L"] },
  { ja: "左人指１", en: ["Index1_L", "Index_01_L", "Index01_L", "IndexFinger1_L"] },
  { ja: "左人指２", en: ["Index2_L", "Index_02_L", "Index02_L", "IndexFinger2_L"] },
  { ja: "左人指３", en: ["Index3_L", "Index_03_L", "Index03_L", "IndexFinger3_L"] },
  { ja: "左中指１", en: ["Middle1_L", "Middle_01_L", "Middle01_L"] },
  { ja: "左中指２", en: ["Middle2_L", "Middle_02_L", "Middle02_L"] },
  { ja: "左中指３", en: ["Middle3_L", "Middle_03_L", "Middle03_L"] },
  { ja: "左薬指１", en: ["Ring1_L", "Ring_01_L", "Ring01_L"] },
  { ja: "左薬指２", en: ["Ring2_L", "Ring_02_L", "Ring02_L"] },
  { ja: "左薬指３", en: ["Ring3_L", "Ring_03_L", "Ring03_L"] },
  { ja: "左小指１", en: ["Pinky1_L", "Pinky_01_L", "Pinky01_L", "Little1_L"] },
  { ja: "左小指２", en: ["Pinky2_L", "Pinky_02_L", "Pinky02_L", "Little2_L"] },
  { ja: "左小指３", en: ["Pinky3_L", "Pinky_03_L", "Pinky03_L", "Little3_L"] },

  // right arm
  { ja: "右肩", en: ["Shoulder_R", "RightShoulder", "R_Shoulder"] },
  { ja: "右腕", en: ["Arm_R", "RightArm", "R_Arm"] },
  { ja: "右ひじ", en: ["Elbow_R", "RightElbow", "R_Elbow"] },
  { ja: "右手首", en: ["Wrist_R", "RightWrist", "R_Wrist"] },
  // right fingers
  { ja: "右親指１", en: ["Thumb_02_R", "Thumb2_R", "Thumb01_R"] },
  { ja: "右親指２", en: ["Thumb_03_R", "Thumb3_R", "Thumb02_R"] },
  { ja: "右人指１", en: ["Index1_R", "Index_01_R", "Index01_R", "IndexFinger1_R"] },
  { ja: "右人指２", en: ["Index2_R", "Index_02_R", "Index02_R", "IndexFinger2_R"] },
  { ja: "右人指３", en: ["Index3_R", "Index_03_R", "Index03_R", "IndexFinger3_R"] },
  { ja: "右中指１", en: ["Middle1_R", "Middle_01_R", "Middle01_R"] },
  { ja: "右中指２", en: ["Middle2_R", "Middle_02_R", "Middle02_R"] },
  { ja: "右中指３", en: ["Middle3_R", "Middle_03_R", "Middle03_R"] },
  { ja: "右薬指１", en: ["Ring1_R", "Ring_01_R", "Ring01_R"] },
  { ja: "右薬指２", en: ["Ring2_R", "Ring_02_R", "Ring02_R"] },
  { ja: "右薬指３", en: ["Ring3_R", "Ring_03_R", "Ring03_R"] },
  { ja: "右小指１", en: ["Pinky1_R", "Pinky_01_R", "Pinky01_R", "Little1_R"] },
  { ja: "右小指２", en: ["Pinky2_R", "Pinky_02_R", "Pinky02_R", "Little2_R"] },
  { ja: "右小指３", en: ["Pinky3_R", "Pinky_03_R", "Pinky03_R", "Little3_R"] },

  // left leg
  { ja: "左足", en: ["Thigh_L", "Leg_L", "LeftLeg", "L_Leg"] },
  { ja: "左ひざ", en: ["Knee_L", "LeftKnee", "L_Knee"] },
  { ja: "左足首", en: ["Ankle_L", "LeftAnkle", "L_Ankle"] },
  { ja: "左つま先", en: ["Toe_L", "ToeTip_L", "LeftToe", "L_Toe"] },
  { ja: "左足先EX", en: ["Toe_L", "Toe_offset_L", "ToeTip_L"] },
  // right leg
  { ja: "右足", en: ["Thigh_R", "Leg_R", "RightLeg", "R_Leg"] },
  { ja: "右ひざ", en: ["Knee_R", "RightKnee", "R_Knee"] },
  { ja: "右足首", en: ["Ankle_R", "RightAnkle", "R_Ankle"] },
  { ja: "右つま先", en: ["Toe_R", "ToeTip_R", "RightToe", "R_Toe"] },
  { ja: "右足先EX", en: ["Toe_R", "Toe_offset_R", "ToeTip_R"] },
];

/**
 * Builds a babylon-mmd retargeting map for `createRuntimeAnimation`.
 *
 * babylon-mmd's map is keyed by the MODEL's bone name and maps to the
 * ANIMATION (VMD) bone name — i.e. `{ "Head": "頭", "Arm_L": "左腕" }`. Only
 * bones present in both the model and the animation are included.
 */
export function buildRetargetingMap(
  modelBoneNames: readonly string[],
  animationBoneNames: readonly string[],
): Record<string, string> {
  const exactByLower = new Map<string, string>();
  for (const name of modelBoneNames) {
    if (!exactByLower.has(name.toLowerCase())) exactByLower.set(name.toLowerCase(), name);
  }

  const animSet = new Set(animationBoneNames);
  const map: Record<string, string> = {};
  for (const bone of BONES) {
    if (!animSet.has(bone.ja)) continue; // the motion doesn't animate this bone
    const candidate = bone.en.find((e) => exactByLower.has(e.toLowerCase()));
    if (candidate !== undefined) {
      map[exactByLower.get(candidate.toLowerCase())!] = bone.ja;
    }
  }
  return map;
}

/**
 * Counts how many animation bone tracks can bind to the model — either by an
 * exact name match or through the retargeting map. Used for the "this motion
 * was made for a different model" warning.
 */
export function countBindableBones(
  modelBoneNames: readonly string[],
  animationBoneNames: readonly string[],
): { matched: number; total: number; retargeted: number } {
  const modelSet = new Set(modelBoneNames);
  const map = buildRetargetingMap(modelBoneNames, animationBoneNames);
  const retargetedNames = new Set(Object.values(map));
  let matched = 0;
  let retargeted = 0;
  for (const name of animationBoneNames) {
    if (modelSet.has(name)) {
      matched++;
    } else if (retargetedNames.has(name)) {
      matched++;
      retargeted++;
    }
  }
  return { matched, total: animationBoneNames.length, retargeted };
}

/** Bones MMD treats as translatable ("movable") — these carry position
 *  animation in a .vmd. Every other bone is rotation-only. */
const MOVABLE_BONE_NAMES = new Set(["センター", "グルーブ", "腰"]);

/**
 * Returns true if a .vmd bone name is a movable (translatable) bone: the
 * standard MMD センター/グルーブ/腰 roots plus every IK target (*ＩＫ).
 *
 * babylon-mmd instead flags a track as "movable" whenever it has any non-zero
 * position, which misreads UmaViewer VMDs (they write a position for every
 * bone) and ends up translating limbs that should only rotate.
 */
export function isMovableBoneName(name: string): boolean {
  return name.endsWith("ＩＫ") || MOVABLE_BONE_NAMES.has(name);
}
