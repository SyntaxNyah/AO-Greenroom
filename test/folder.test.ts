import { describe, expect, it } from "vitest";
import { buildCharacterFolder } from "../src/export/folder";
import { defaultCharacter, defaultEmotes } from "../src/model/project";

const decoder = new TextDecoder();

describe("buildCharacterFolder", () => {
  it("emits char.ini, camera.json and the passed assets", () => {
    const folder = buildCharacterFolder({
      character: defaultCharacter(),
      emotes: defaultEmotes(),
      cameraRig: { default: { distance: 2.3 } },
      assets: [{ path: "model.pmx", data: new Uint8Array([1]) }],
    });

    const paths = folder.map((f) => f.path);
    expect(paths).toContain("char.ini");
    expect(paths).toContain("camera.json");
    expect(paths).toContain("model.pmx");

    const ini = folder.find((f) => f.path === "char.ini");
    expect(decoder.decode(ini?.data)).toContain("model = model.pmx");

    const camera = folder.find((f) => f.path === "camera.json");
    expect(decoder.decode(camera?.data)).toContain('"distance": 2.3');
  });
});
