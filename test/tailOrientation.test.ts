import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { tailFrameFromDirection } from "../src/stage/tailOrientation";

describe("tailFrameFromDirection", () => {
  it("returns identity for an axis-aligned +X direction", () => {
    const q = new Quaternion();
    expect(tailFrameFromDirection(new Vector3(1, 0, 0), q)).toBe(true);
    expect(q.x).toBeCloseTo(0, 5);
    expect(q.y).toBeCloseTo(0, 5);
    expect(q.z).toBeCloseTo(0, 5);
    expect(Math.abs(q.w)).toBeCloseTo(1, 5);
  });

  it("returns a non-identity frame for a downward direction", () => {
    const q = new Quaternion();
    expect(tailFrameFromDirection(new Vector3(0, -1, 0), q)).toBe(true);
    expect(Math.abs(q.w)).not.toBeCloseTo(1, 3);
  });

  it("rejects a zero-length direction", () => {
    const q = new Quaternion();
    expect(tailFrameFromDirection(new Vector3(0, 0, 0), q)).toBe(false);
  });

  it("rotates the +X axis to point along the direction", () => {
    const dir = new Vector3(0.5, -0.5, 0.7).normalize();
    const q = new Quaternion();
    expect(tailFrameFromDirection(dir, q)).toBe(true);
    const xAxis = new Vector3(1, 0, 0).applyRotationQuaternion(q);
    expect(xAxis.x).toBeCloseTo(dir.x, 4);
    expect(xAxis.y).toBeCloseTo(dir.y, 4);
    expect(xAxis.z).toBeCloseTo(dir.z, 4);
  });
});
