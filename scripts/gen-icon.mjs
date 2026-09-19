// Generates a simple placeholder app icon (1024x1024 PNG) for the Tauri build.
// Run: node scripts/gen-icon.mjs   (then: npm run tauri icon src-tauri/app-icon.png)
// The real mascot art can be swapped in later — this just gives CI a valid source.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Raw RGBA scanlines, one filter byte (0) per row.
const stride = W * 4;
const raw = Buffer.alloc((stride + 1) * H);
for (let y = 0; y < H; y++) {
  const row = y * (stride + 1);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    const i = row + 1 + x * 4;
    raw[i] = 18 + Math.round((x / W) * 22); // R
    raw[i + 1] = 26 + Math.round((y / H) * 34); // G
    raw[i + 2] = 44 + Math.round(((x + y) / (W + H)) * 40); // B
    raw[i + 3] = 255; // A
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: truecolor + alpha
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync("src-tauri", { recursive: true });
writeFileSync("src-tauri/app-icon.png", png);
console.log(`Wrote src-tauri/app-icon.png (${png.length} bytes)`);
