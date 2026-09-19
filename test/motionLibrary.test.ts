import { describe, expect, it } from "vitest";
import { guessMotionRole, motionStem } from "../src/stage/motionLibrary";

describe("motionStem", () => {
  it("strips the .vmd extension and any folders", () => {
    expect(motionStem("motions/idle.vmd")).toBe("idle");
    expect(motionStem("objection.VMD")).toBe("objection");
  });
});

describe("guessMotionRole", () => {
  it("classifies common motion names", () => {
    expect(guessMotionRole("idle.vmd")).toBe("idle");
    expect(guessMotionRole("stand_01.vmd")).toBe("idle");
    expect(guessMotionRole("objection.vmd")).toBe("objection");
    expect(guessMotionRole("walk_loop.vmd")).toBe("walk");
  });

  it("does not confuse point with objection", () => {
    expect(guessMotionRole("point.vmd")).toBe("point");
  });
});
