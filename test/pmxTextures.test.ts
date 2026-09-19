import { describe, expect, it } from "vitest";
import { parsePmxTexturePaths } from "../src/stage/pmxTextures";

function i32(v: number): number[] {
  const b = new ArrayBuffer(4);
  new DataView(b).setInt32(0, v, true);
  return [...new Uint8Array(b)];
}

function f32(v: number): number[] {
  const b = new ArrayBuffer(4);
  new DataView(b).setFloat32(0, v, true);
  return [...new Uint8Array(b)];
}

/** Builds a minimal valid PMX with the given texture paths. */
function buildPmx(textures: string[], utf16 = false): Uint8Array {
  const parts: number[] = [];
  const push = (...a: number[]) => parts.push(...a);
  const pushStr = (s: string): void => {
    const bytes = utf16
      ? new Uint8Array([...s].flatMap((c) => {
          const code = c.charCodeAt(0);
          return [code & 0xff, code >> 8];
        }))
      : new TextEncoder().encode(s);
    push(...i32(bytes.length), ...bytes);
  };

  push(...[..."PMX "].map((c) => c.charCodeAt(0)));
  push(...f32(2.0));
  push(8); // globals count
  push(utf16 ? 0 : 1, 0, 1, 1, 1, 1, 1, 1); // encoding, extraUV, index sizes
  pushStr("Test");
  pushStr("");
  pushStr("");
  pushStr("");
  push(...i32(1)); // vertex count
  push(...new Array(32).fill(0)); // pos + normal + uv
  push(1); // weight type: BDEF2
  push(0, 0); // 2 bone indices
  push(...f32(1.0)); // weight
  push(...f32(0)); // edge scale
  push(...i32(1)); // index count
  push(0); // one index
  push(...i32(textures.length));
  for (const t of textures) pushStr(t);

  return new Uint8Array(parts);
}

describe("parsePmxTexturePaths", () => {
  it("reads utf-8 texture paths", () => {
    const pmx = buildPmx(["Texture2D/tex_a.png", "tex_b.png"]);
    expect(parsePmxTexturePaths(pmx.buffer as ArrayBuffer)).toEqual(["Texture2D/tex_a.png", "tex_b.png"]);
  });

  it("reads utf-16le texture paths", () => {
    const pmx = buildPmx(["Texture2D/tex_a.png"], true);
    expect(parsePmxTexturePaths(pmx.buffer as ArrayBuffer)).toEqual(["Texture2D/tex_a.png"]);
  });

  it("returns null for a non-PMX buffer", () => {
    expect(parsePmxTexturePaths(new TextEncoder().encode("hello").buffer)).toBeNull();
  });
});
