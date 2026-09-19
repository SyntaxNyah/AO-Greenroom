import { describe, expect, it } from "vitest";
import { autoFramePose } from "../src/stage/frameFromSkeleton";

describe("autoFramePose", () => {
  it("places the look-target just above the character's centre", () => {
    const pose = autoFramePose(30, 0, 1);
    expect(pose.targetY).toBeCloseTo(0.57, 2);
    expect(pose.yaw).toBe(0);
    expect(pose.pitch).toBe(0);
    expect(pose.fov).toBe(30);
  });

  it("moves the camera closer as fov widens", () => {
    const narrow = autoFramePose(30, 0, 1).distance ?? 0;
    const wide = autoFramePose(60, 0, 1).distance ?? 0;
    expect(wide).toBeLessThan(narrow);
  });

  it("is independent of the character's scale", () => {
    const small = autoFramePose(30, 0, 1);
    const tall = autoFramePose(30, 10, 20);
    expect(tall.targetY).toBeCloseTo(small.targetY ?? 0, 5);
    expect(tall.distance).toBeCloseTo(small.distance ?? 0, 5);
  });
});
