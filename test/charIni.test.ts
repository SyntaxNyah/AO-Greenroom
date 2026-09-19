import { describe, expect, it } from "vitest";
import { serializeCharIni } from "../src/export/charIni";
import { defaultCharacter, defaultEmotes, type EmoteDef } from "../src/model/project";

describe("serializeCharIni", () => {
  it("emits the [options] model key that marks the character as 3D", () => {
    const character = defaultCharacter();
    character.model = "model.pmx";
    const ini = serializeCharIni(character, defaultEmotes());
    expect(ini).toContain("[options]");
    expect(ini).toContain("model = model.pmx");
  });

  it("emits [emotions] as block names and [emote <name>] blocks", () => {
    const ini = serializeCharIni(defaultCharacter(), defaultEmotes());
    expect(ini).toContain("number = 3");
    expect(ini).toContain("1 = idle");
    expect(ini).toContain("[emote idle]");
    expect(ini).toContain("anim = idle.vmd");
  });

  it("emits optional fields only when present", () => {
    const emotes: EmoteDef[] = [
      {
        key: "objection",
        name: "Objection!",
        anim: "objection",
        preanim: "obj_intro",
        sound: "objection.opus",
        soundDelayMs: 480,
        deskmod: "shown",
        modifier: "zoom",
      },
    ];
    const ini = serializeCharIni(defaultCharacter(), emotes);
    expect(ini).toContain("anim = objection.vmd");
    expect(ini).toContain("preanim = obj_intro.vmd");
    expect(ini).toContain("desc = Objection!");
    expect(ini).toContain("sound = objection.opus");
    expect(ini).toContain("sounddelayms = 480");
    expect(ini).toContain("deskmod = shown");
    expect(ini).toContain("modifier = zoom");
  });
});
