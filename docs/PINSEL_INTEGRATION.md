# Pinsel integration

[Pinsel-AO-Char-Maker](https://github.com/SyntaxNyah/Pinsel-AO-Char-Maker) is
the **2D** AO2 character maker. AO-Greenroom is the **3D** rigger. They share
one thing: the `char.ini` / `camera.json` asset formats. To keep the two tools
interoperable, Pinsel should become *format-compatible* with 3D characters —
it can read/write them "blind" (no 3D preview) and round-trip them without
losing data.

This is a small, engine-only change set; no 3D runtime in Pinsel.

## 1. Add the `[options] model` key

- `lib/src/core/ao_constants.dart`: add a `model` option constant.
- `lib/src/core/character.dart`: add a `String? model` field to the `[options]`
  model, serialize/parse it losslessly (a character is **3D** when it is set).
- `lib/src/core/ao_ini.dart`: treat `model` like the other `[options]` keys.

## 2. Support the `[emote <name>]` block encoding

Pinsel currently emits the legacy `[emotions]` banks
(`N = desc#preanim#anim#modifier#deskmod`). The new preferred encoding uses a
`[emotions]` list of block names plus one `[emote <name>]` block per emote:

```ini
[emotions]
number = 2
1 = idle
2 = objection

[emote idle]
anim = idle.vmd

[emote objection]
anim = objection.vmd
preanim = objection_intro.vmd
sound = objection.opus
sounddelayms = 480
modifier = zoom
deskmod = shown
```

- `anim` / `preanim` are file names (extension included) — VMD for 3D, sprite
  base name for 2D.
- `sound` is a file name with extension; `sounddelayms` is in milliseconds.
- `modifier` / `deskmod` are symbolic (`zoom`, `shown`, …); readers should also
  accept the legacy integer encoding.

Pinsel should **parse** both encodings into the same normalized `Emote`, and
**emit** the block encoding (at least for 3D characters; 2D can keep the
legacy banks for compatibility with older clients).

## 3. Add a `CameraRig` model

New pure-Dart file `lib/src/core/camera_rig.dart` — a drop-in reference is in
[`../pinsel/camera_rig.dart`](../pinsel/camera_rig.dart). It (de)serializes the
`camera.json` sidecar (`Pose`, `Keyframe`, `KeyedClip`, `EmoteCamera`,
`CameraRig`) exactly per `CameraRig.schema.json`.

## 4. Treat model/motion files as passthrough assets

- `lib/src/discovery/sprite_scanner.dart`: `.pmx` and `.vmd` files should not be
  classified as sprites; carry them through as opaque assets.

## 5. Export a 3D character

In the Organizer (`lib/src/discovery/organizer.dart`): when the character has a
`model`, also write:

- `camera.json` (from the `CameraRig` model; default to an auto-framed pose),
- the `.pmx` and `.vmd` files at their expected paths (`<anim>.vmd`).

## 6. Tests + docs

- `test/camera_rig_test.dart` — round-trip of the camera.json model.
- A `char.ini` round-trip test for a 3D character.
- New `docs/THREE_D.md` (or a section in `README.md`) explaining that 3D
  character rigging lives in **AO-Greenroom**, and that Pinsel can open/export
  them losslessly.
- Update `ROADMAP.md`.
