import { describe, expect, it } from "vitest";
import { parseCameraRig, serializeCameraRig } from "../src/export/cameraJson";
import type { CameraRig } from "../src/model/project";

describe("serializeCameraRig", () => {
  it("round-trips a default static pose", () => {
    const rig: CameraRig = { default: { targetY: 0.57, distance: 2.3 } };
    expect(parseCameraRig(serializeCameraRig(rig))).toEqual(rig);
  });

  it("round-trips keyed clips with easing", () => {
    const rig: CameraRig = {
      emotes: {
        objection: {
          preanim: {
            keys: [
              { t: 0, distance: 4 },
              { t: 1, distance: 2 },
            ],
            easing: "easeOut",
          },
        },
      },
    };
    expect(parseCameraRig(serializeCameraRig(rig))).toEqual(rig);
  });

  it("drops undefined fields and empty emotes", () => {
    const json = serializeCameraRig({ default: { distance: 2.3 } });
    expect(json).not.toContain("targetY");
    expect(json).not.toContain("emotes");
  });
});
