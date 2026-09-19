import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "../src/export/zip";

const encoder = new TextEncoder();

describe("crc32", () => {
  it("matches the IEEE reference vector", () => {
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("buildZip", () => {
  it("produces a well-formed zip with the expected signatures", () => {
    const zip = buildZip([
      { name: "char.ini", data: encoder.encode("[options]\n") },
      { name: "a.bin", data: new Uint8Array([1, 2, 3, 4]) },
    ]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

    // Local file header signature at offset 0.
    expect(view.getUint32(0, true)).toBe(0x04034b50);

    // End-of-central-directory signature at the very end.
    const eocdOffset = zip.length - 22;
    expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
    // Two entries on the disk and in total.
    expect(view.getUint16(eocdOffset + 10, true)).toBe(2);
  });
});
