import { describe, expect, it } from "vitest";
import { referencePaths } from "../src/stage/referenceFiles";

describe("referencePaths", () => {
  it("keeps the full path plus a basename alias for a subfolder path", () => {
    expect(referencePaths("Texture2D/tex.png")).toEqual(["Texture2D/tex.png", "tex.png"]);
  });

  it("normalizes backslashes", () => {
    expect(referencePaths("Texture2D\\tex.png")).toEqual(["Texture2D/tex.png", "tex.png"]);
  });

  it("returns just the name for a bare filename", () => {
    expect(referencePaths("tex.png")).toEqual(["tex.png"]);
  });

  it("returns empty for an empty path", () => {
    expect(referencePaths("")).toEqual([]);
  });
});
