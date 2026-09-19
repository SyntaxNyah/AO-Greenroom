// Minimal PMX texture-table parser. Reads only the header + the texture name
// list so we can resolve a model's referenced textures (e.g. "Texture2D/a.png")
// to the files a user dropped. PMX 2.0/2.1 binary layout, little-endian.

/** Returns the texture paths referenced by a PMX, or null if it can't be read. */
export function parsePmxTexturePaths(buffer: ArrayBuffer): string[] | null {
  try {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    if (buffer.byteLength < 20) return null;
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    if (magic !== "PMX ") return null;

    const globalsCount = view.getUint8(8);
    let off = 9;
    if (off + globalsCount > buffer.byteLength) return null;

    const encoding = view.getUint8(off); // 0 = UTF-16LE, 1 = UTF-8
    const extraUvCount = view.getUint8(off + 1);
    const vertexIndexSize = view.getUint8(off + 2);
    const boneIndexSize = view.getUint8(off + 5);
    off += globalsCount;

    const decoder = encoding === 0 ? new TextDecoder("utf-16le") : new TextDecoder("utf-8");

    const readInt32 = (): number => {
      const v = view.getInt32(off, true);
      off += 4;
      return v;
    };
    const readUint32 = (): number => {
      const v = view.getUint32(off, true);
      off += 4;
      return v;
    };
    const readText = (): string => {
      const len = readInt32();
      if (len < 0 || off + len > buffer.byteLength) throw new Error("Bad PMX string");
      const slice = bytes.subarray(off, off + len);
      off += len;
      return decoder.decode(slice);
    };

    // Four localized name/comment strings.
    readText();
    readText();
    readText();
    readText();

    const vertexCount = readUint32();
    if (vertexCount * 32 > buffer.byteLength) return null;
    for (let v = 0; v < vertexCount; v++) {
      off += 32 + extraUvCount * 16; // pos(12) + normal(12) + uv(8) [+ extra uv]
      const weightType = view.getUint8(off);
      off += 1;
      if (weightType === 0) off += boneIndexSize;
      else if (weightType === 1) off += boneIndexSize * 2 + 4;
      else if (weightType === 2) off += boneIndexSize * 4 + 16;
      else if (weightType === 3) off += boneIndexSize * 4 + 52; // SDEF
      else off += boneIndexSize * 4 + 16; // QDEF
      off += 4; // edge scale
    }

    const indexCount = readUint32();
    if (indexCount * vertexIndexSize > buffer.byteLength) return null;
    off += indexCount * vertexIndexSize;

    const textureCount = readUint32();
    if (textureCount > buffer.byteLength) return null;
    const paths: string[] = [];
    for (let t = 0; t < textureCount; t++) paths.push(readText());
    return paths;
  } catch {
    return null;
  }
}
