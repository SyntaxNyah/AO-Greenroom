// Builds babylon-mmd "reference files" from dropped texture files, so a model
// loaded from a blob URL can still resolve its textures by relative path.

import type { IArrayBufferFile } from "babylon-mmd/esm/Loader/referenceFileResolver";

export interface TextureAsset {
  /** Relative path the PMX references, e.g. "Texture2D/tex.png". */
  path: string;
  file: File;
}

/** Paths to register for a texture so a PMX reference (with or without a
 *  folder prefix) resolves. Pure and unit-tested. */
export function referencePaths(path: string): string[] {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized) return [];
  const basename = normalized.split("/").pop() ?? "";
  if (basename && basename !== normalized) return [normalized, basename];
  return [normalized];
}

export async function buildReferenceFiles(textures: TextureAsset[]): Promise<IArrayBufferFile[]> {
  const out: IArrayBufferFile[] = [];
  for (const texture of textures) {
    const data = await texture.file.arrayBuffer();
    const mimeType = texture.file.type || undefined;
    for (const relativePath of referencePaths(texture.path)) {
      out.push({ relativePath, mimeType, data });
    }
  }
  return out;
}
