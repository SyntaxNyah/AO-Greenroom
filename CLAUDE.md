# CLAUDE.md — AO-Greenroom developer guide

Working manual for anyone (especially Claude) building in this repo.

## Principles

1. **Pure engine vs Babylon split.** Everything under `src/model`, `src/export`,
   and the pure parts of `src/stage` (`frameFromSkeleton.ts`, `motionLibrary.ts`)
   is plain TypeScript with **no Babylon import** and is unit-tested. Only
   `src/stage/mmdStage.ts` and `src/ui/**` touch Babylon/DOM. Keep it that way
   so the export/format logic stays testable in Node.
2. **The tool writes, the client reads.** AO-Greenroom *emits* `char.ini` +
   `camera.json` + a folder of assets. It does not parse `char.ini` back — it
   round-trips its own `.greenroom.json` project instead.
3. **Formats live in `schemas/`** (vendored from
   [aolib-meta](https://github.com/OmniTroid/aolib-meta)). The char.ini/camera
   writers and `docs/FORMATS.md` must stay in sync with these.
4. **Lossless optional fields.** Emit a field only when present; never write
   empty/default junk.

## Build / run / test

```bash
npm install        # or: bun install
npm run dev        # Vite dev server → http://localhost:5173
npm test           # vitest (pure engine tests; no browser needed)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build → ./dist
```

Desktop (Tauri, needs Rust): `npm run tauri dev` / `npm run tauri build`.

## Directory map

```
src/
  model/project.ts       GreenroomProject, CharacterDef, EmoteDef, CameraRig, Pose, …
  export/charIni.ts      writes the new [emote <name>] char.ini encoding
  export/cameraJson.ts   writes camera.json (Pose / KeyedClip)
  export/validate.ts     friendly pre-export checks (mirrors the schemas)
  export/folder.ts       char.ini + camera.json + assets → named files
  export/zip.ts          dependency-free STORE-method ZIP writer
  stage/mmdStage.ts      Babylon + babylon-mmd viewport (lazy-imported)
  stage/frameFromSkeleton.ts  auto-frame → height-normalized Pose
  stage/motionLibrary.ts filename → role heuristic
  ui/app.ts              the single-page wizard
  ui/dom.ts              tiny DOM helpers
schemas/                 vendored CameraRig + CharIni JSON Schema
test/                    vitest suites for the pure engine
```

## Gotchas

- **babylon-mmd API**: `MmdModel.destroyRuntimeAnimation(handle)` (not
  `removeRuntimeAnimation`) and `MmdRuntime.destroyMmdModel(model)` (not
  `removeMmdModel`). `seekAnimation`/`playAnimation` return `Promise<void>`.
- **Measure the skeleton before `createMmdModel`.** After the runtime creates
  the model it disables standard bone world-matrix updates, so
  `bone.getAbsolutePosition()` is only reliable *before*.
- **Camera Pose mapping** (in `applyPose`/`currentPose`): Pose is
  height-normalized. `targetY` is a fraction of height, `distance` in
  character-heights. Babylon's `ArcRotateCamera.beta` is measured from +Y, so
  `beta = π/2 − pitch`, and `alpha = −yaw`. Keep the two sides inverse.
- **Lazy Babylon import.** `src/ui/app.ts` dynamic-imports `mmdStage.ts` only
  once a model is dropped, so the initial page load stays small (Babylon is a
  ~1.4 MB chunk).
- **char.ini emits extensions** (`anim = idle.vmd`, `sound = objection.opus`)
  and `sounddelayms` in milliseconds; `modifier`/`deskmod` are symbolic
  (`zoom`, `shown`). Readers accept both symbolic and legacy numeric forms.
- **Textures resolve from dropped files, not the blob URL.** `mmdStage.loadModel`
  takes `TextureAsset[]`; the UI reads the PMX texture table
  (`stage/pmxTextures.ts`), matches dropped files by basename, then passes them
  to babylon-mmd as `referenceFiles` (typed `IArrayBufferFile`, cast to
  `File[]`). Without this a model loaded from a blob URL renders with no
  textures. Folder structure is captured via `webkitGetAsEntry` on drop.

## How to add a camera feature

Everything flows through the `Pose`/`Clip` types in `model/project.ts` and the
`serializeCameraRig` writer. Add UI in `app.ts` (`renderCamera`), a pure helper
in `src/stage` if it's math, and a test in `test/`.
