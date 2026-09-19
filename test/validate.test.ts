import { describe, expect, it } from "vitest";
import { hasErrors, validateProject } from "../src/export/validate";
import { newProject } from "../src/model/project";

describe("validateProject", () => {
  it("passes a fresh default project", () => {
    expect(hasErrors(validateProject(newProject()))).toBe(false);
  });

  it("flags a missing model", () => {
    const project = newProject();
    project.character.model = "";
    expect(hasErrors(validateProject(project))).toBe(true);
  });

  it("flags duplicate emote keys", () => {
    const project = newProject();
    project.emotes[0]!.key = project.emotes[1]!.key;
    expect(hasErrors(validateProject(project))).toBe(true);
  });

  it("flags a keyframe time outside 0..1", () => {
    const project = newProject();
    project.cameraRig.default = { keys: [{ t: 2, distance: 2 }] };
    expect(hasErrors(validateProject(project))).toBe(true);
  });

  it("flags an out-of-range fov", () => {
    const project = newProject();
    project.cameraRig.default = { fov: 200 };
    expect(hasErrors(validateProject(project))).toBe(true);
  });
});
