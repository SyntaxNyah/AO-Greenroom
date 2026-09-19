# Formats

AO-Greenroom writes the asset formats defined by
[aolib-meta](https://github.com/OmniTroid/aolib-meta) `schemas/assets/`. This is
a condensed reference for what this tool emits; the canonical spec is the JSON
Schema files in [`../schemas/`](../schemas/).

A character is **3D** when `char.ini` has `[options] model = <name>.pmx`;
otherwise it is 2D. For 3D, an emote's `anim` is a base-loop VMD stem (idle and
talking share it; the mouth is morph-driven by the client), and `preanim` is an
optional one-shot VMD stem.

## Folder layout

The client (LemmyAO) resolves a character at `characters/<name lowercased>/`:

```
Aurelia/
├── char.ini
├── camera.json
├── model.pmx
├── textures/…        # whatever the .pmx references, relative paths preserved
├── idle.vmd          # <anim>.vmd  for the "idle" emote
├── objection.vmd
├── objection_intro.vmd   # <preanim>.vmd  for the "objection" emote
└── …
```

## char.ini

The new preferred `[emote <name>]` block encoding (block name = emote `key`):

```ini
[options]
name = Aurelia
showname = Aurelia
side = defense
gender = female
blips = female
chat = default
category = default
model = model.pmx

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

Block fields: `anim` / `preanim` (VMD file names, extension included), `desc`
(button label when it differs from the key), `sound` (file name with extension),
`sounddelayms` (milliseconds), and symbolic `modifier` / `deskmod` (e.g. `zoom`,
`shown`). Readers should accept **both** the new symbolic form and the legacy
numeric encoding. See `CharIni.schema.json`.

## camera.json

Sits beside `char.ini`, keyed by emote `key`. Poses are **height-normalized**
so a rig is stable across models of any scale.

A `Pose` has all-optional fields: `targetY` (0=feet…1=head), `distance` (in
character-heights, > 0), `yaw` (deg, + = orbit left), `pitch` (deg, + = looking
down), `fov` (vertical deg, 0..180). A bare `Pose` is a static hold; a
`KeyedClip` (`keys[]` + `easing`) is an animated camera whose `t` is 0..1 across
the driving motion.

```json
{
  "default": { "targetY": 0.57, "distance": 2.3, "fov": 30 },
  "emotes": {
    "objection": {
      "loop": { "distance": 2.0 },
      "preanim": {
        "keys": [
          { "t": 0, "distance": 4.0 },
          { "t": 1, "distance": 2.0 }
        ],
        "easing": "easeOut"
      }
    }
  }
}
```

Resolution: for emote `E` in phase `P`, the active shot is
`emotes[E].P ?? (P === "loop" ? default : none)`.

## Auto-framing

The default pose is derived from the skeleton's vertical extent with ~18%
headroom and the feet near the bottom of the frame, then normalized to the
character's height (see `src/stage/frameFromSkeleton.ts`). For a 30° vertical
FOV this is `targetY ≈ 0.57`, `distance ≈ 2.3`.
