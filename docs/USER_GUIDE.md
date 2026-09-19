# User guide

AO-Greenroom turns an MMD model into an AO2 3D character. You do not need to
know anything about `char.ini` or JSON. Four steps, top to bottom.

## 1 · Import

Drag your model's **folder** onto the big "Drop a folder here" box — the `.pmx`
model, its textures, and as many `.vmd` motions as you like. (You can also click
the box and pick files.)

- The first `.pmx` found becomes the model.
- Every `.vmd` becomes a motion in the library.
- Everything else is treated as a texture/asset and kept.

The model appears in the viewport, auto-framed.

## 2 · Emotes

An **emote** is one button in the AO character. It has:

- **key** — its id (also used as the motion file name). Keep it simple, no
  spaces (e.g. `objection`).
- **label** — what shows on the button.
- **Loop** — the motion it plays while idle and while talking (the client
  animates the mouth over it automatically).
- **Intro** — an optional one-shot motion played when the emote first plays.

When you import motions, Greenroom guesses which motion belongs to which emote
(it recognises `idle`, `objection`, `point`, `walk`, …). Adjust the dropdowns
only if it got something wrong.

Use **+ Add emote** to add more, and **×** to remove one.

## 3 · Camera

Because a 3D model has no framing baked in, you pick the camera per emote.

- **Drag** in the viewport to orbit, **scroll** to zoom.
- **Auto-frame** resets to a sensible full-body shot.
- The presets (**Full body**, **Waist up**, **Headshot**, **Low drama**, …) are
  one-click starting points.
- To rig an emote: click that emote's **Frame camera**, frame the shot, then
  **Set "<emote>" loop** (the resting shot) and, optionally, **Set "<emote>"
  intro** (the shot during the intro motion).
- **Set default shot** sets the fallback used by every emote that doesn't
  override it.

Need a moving camera (e.g. a zoom-in during an intro)? Open **Advanced
(camera.json)** and hand-edit the keyframes — see
[docs/FORMATS.md](FORMATS.md).

## 4 · Export

Click **Export character**. It downloads `<name>.zip` containing the finished
character folder. Drop that folder into AO2/webAO (or your AO server's
`characters/` directory) and it just works.

## Saving & reopening

- **Save project** writes a `.greenroom.json` with all your emote/camera work.
- **Open project** reloads it — then re-drop the model + motions to continue
  (browsers can't store the raw files between sessions).

## Troubleshooting

- **Model won't load / textures missing:** make sure you dropped the model
  *together with* its texture files (a `.pmx` references textures by relative
  path). Some models from game rips need their textures in a matching folder.
- **Emote got the wrong motion:** just pick the right one in the **Loop** /
  **Intro** dropdown.
- **Character looks tiny or huge:** click **Auto-frame** and re-export.
