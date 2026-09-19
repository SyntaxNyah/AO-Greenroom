import { describe, expect, it } from "vitest";
import { buildRetargetingMap, countBindableBones, isMovableBoneName } from "../src/stage/boneRetarget";

// Mirrors a Fenomeno-style model: English bone names with a humanoid skeleton.
const ENGLISH_MODEL = [
  "Position",
  "Hip",
  "Waist",
  "Spine",
  "Chest",
  "Neck",
  "Head",
  "Shoulder_L",
  "Arm_L",
  "Elbow_L",
  "Wrist_L",
  "Thumb_01_L",
  "Thumb_02_L",
  "Thumb_03_L",
  "Index_01_L",
  "Shoulder_R",
  "Arm_R",
  "Elbow_R",
  "Wrist_R",
  "Thigh_L",
  "Knee_L",
  "Ankle_L",
  "Toe_L",
  "Thigh_R",
  "Knee_R",
  "Ankle_R",
  "Toe_R",
];

const JAPANESE_VMD = [
  "センター",
  "グルーブ",
  "上半身",
  "上半身2",
  "首",
  "頭",
  "左肩",
  "左腕",
  "左ひじ",
  "左手首",
  "左親指１",
  "左親指２",
  "左人指１",
  "右肩",
  "右腕",
  "右ひじ",
  "右手首",
  "左足",
  "左ひざ",
  "左足首",
  "左つま先",
  "右足",
  "右ひざ",
  "右足首",
  "右つま先",
];

describe("buildRetargetingMap", () => {
  it("maps model bone names to the matching Japanese VMD bone names", () => {
    const map = buildRetargetingMap(ENGLISH_MODEL, JAPANESE_VMD);
    expect(map["Head"]).toBe("頭");
    expect(map["Neck"]).toBe("首");
    // UmaViewer convention: 上半身 = Spine, 上半身2 = Chest.
    expect(map["Spine"]).toBe("上半身");
    expect(map["Chest"]).toBe("上半身2");
    expect(map["Position"]).toBe("センター");
    expect(map["Hip"]).toBe("グルーブ");
    expect(map["Arm_L"]).toBe("左腕");
    expect(map["Elbow_L"]).toBe("左ひじ");
    expect(map["Wrist_L"]).toBe("左手首");
    expect(map["Thigh_L"]).toBe("左足");
    expect(map["Knee_L"]).toBe("左ひざ");
    expect(map["Ankle_L"]).toBe("左足首");
    expect(map["Toe_L"]).toBe("左つま先");
    // UmaViewer convention: 親指１ = Thumb_02, 親指２ = Thumb_03.
    expect(map["Thumb_02_L"]).toBe("左親指１");
    expect(map["Thumb_03_L"]).toBe("左親指２");
    expect(map["Index_01_L"]).toBe("左人指１");
    expect(map["Arm_R"]).toBe("右腕");
  });

  it("only includes bones present in both the model and the animation", () => {
    const map = buildRetargetingMap(["Head", "Neck"], ["頭"]);
    expect(map["Head"]).toBe("頭");
    expect(map["Neck"]).toBeUndefined(); // 首 not animated
  });

  it("matches English names case-insensitively", () => {
    const map = buildRetargetingMap(["head", "NECK"], ["頭", "首"]);
    expect(map["head"]).toBe("頭");
    expect(map["NECK"]).toBe("首");
  });

  it("returns an empty map when nothing matches", () => {
    expect(buildRetargetingMap(["Tail_Ctrl"], ["頭"])).toEqual({});
  });
});

describe("countBindableBones", () => {
  it("counts direct matches and retargeted matches", () => {
    const result = countBindableBones(ENGLISH_MODEL, JAPANESE_VMD);
    // None of the Japanese names match the model directly, so every match is
    // via the retargeting map.
    expect(result.matched).toBe(JAPANESE_VMD.length);
    expect(result.retargeted).toBe(JAPANESE_VMD.length);
    expect(result.total).toBe(JAPANESE_VMD.length);
  });

  it("counts an exact name match without treating it as retargeted", () => {
    const result = countBindableBones(["Head", "Neck"], ["Head"]);
    expect(result.matched).toBe(1);
    expect(result.retargeted).toBe(0);
    expect(result.total).toBe(1);
  });

  it("reports zero matches for a wholly different skeleton", () => {
    const result = countBindableBones(["Tail_Ctrl", "Ear_01_L"], ["頭", "首"]);
    expect(result.matched).toBe(0);
    expect(result.total).toBe(2);
  });
});

describe("isMovableBoneName", () => {
  it("marks the standard translatable bones and IK targets", () => {
    expect(isMovableBoneName("センター")).toBe(true);
    expect(isMovableBoneName("グルーブ")).toBe(true);
    expect(isMovableBoneName("腰")).toBe(true);
    expect(isMovableBoneName("左足ＩＫ")).toBe(true);
    expect(isMovableBoneName("右つま先ＩＫ")).toBe(true);
  });

  it("treats every other bone as rotation-only", () => {
    expect(isMovableBoneName("上半身")).toBe(false);
    expect(isMovableBoneName("頭")).toBe(false);
    expect(isMovableBoneName("左腕")).toBe(false);
    expect(isMovableBoneName("左足")).toBe(false);
    expect(isMovableBoneName("首")).toBe(false);
  });
});
