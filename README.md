# AO-Greenroom

The **idiot-proof AO2 3D (MMD) character rigger.** Drop in a `.pmx` model and a
handful of `.vmd` motions and get back a finished, AO2/webAO-ready 3D character:
`char.ini` + `camera.json` + model + motions, zipped and ready to drop in.

Built for content creators who have never touched an INI file. Every step has a
sensible default; you can rig a whole character without typing a single number.

Runs in the browser (hosted on GitHub Pages), as a downloadable static build,
and as a desktop app (Windows / macOS / Linux).

## Why

[AO-Greenroom](https://github.com/SyntaxNyah/AO-Greenroom) is the missing
"character workbench" for
[LemmyAO PR #53](https://github.com/SyntaxNyah/LemmyAO/pull/53) — 3D (MMD)
character support for the web AO client. The client can *play* 3D characters;
this is the tool that makes them *easy to make*.

The file formats are defined by
[aolib-meta](https://github.com/OmniTroid/aolib-meta) (`schemas/assets/`). See
[docs/FORMATS.md](docs/FORMATS.md) and the vendored `schemas/` for the spec.

## What it produces

A character folder with:

| File | Purpose |
|---|---|
| `char.ini` | `[options] model = *.pmx` + `[emote <name>]` blocks (the new 3D encoding) |
| `camera.json` | Per-emote camera rig (height-normalized poses, keyed by emote) |
| `*.pmx` | The model |
| `<anim>.vmd` | Each emote's base loop motion (idle + talking share it) |
| `<preanim>.vmd` | Each emote's optional intro motion |
| `textures/…` | Model textures, preserving their relative paths |

## How to use (in one pass)

1. **Drop a folder** containing your `.pmx` model, its textures, and any `.vmd`
   motions. It auto-detects everything.
2. **Emotes** are suggested from your motion names; tweak the loop/intro motion
   per emote (or don't — it usually guesses right).
3. **Camera** auto-frames your model. Drag to orbit, scroll to zoom, then
   "Set loop"/"Set intro" per emote (or use a preset like *Headshot* / *Low
   drama*).
4. **Export** — one click downloads a zipped character folder.

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for the full click-by-click guide.

## Getting it

- **Use it now (browser):** the GitHub Pages deployment (see repo Settings →
  Pages after the first CI run).
- **Download the web build:** the `ao-greenroom-web` artifact on any
  [Actions](https://github.com/SyntaxNyah/AO-Greenroom/actions) run, or the
  `ao-greenroom-web.zip` attached to each release.
- **Desktop binaries:** Windows / macOS / Linux installers are attached to each
  [release](https://github.com/SyntaxNyah/AO-Greenroom/releases).

## Development

```bash
npm install       # or: bun install
npm run dev       # http://localhost:5173
npm test          # vitest (pure engine tests)
npm run build     # tsc --noEmit && vite build → ./dist
```

Stack: TypeScript + Vite + Vitest, with
[@babylonjs/core](https://www.babylonjs.com/) and
[babylon-mmd](https://github.com/noname0310/babylon-mmd) for the viewport. The
AO metadata/export engine is pure TypeScript (no Babylon) and fully unit-tested.

## Credits

See [CREDITS.md](CREDITS.md). This project stands on the shoulders of OmniTroid's
3D work, the Attorney Online community, Babylon.js, and babylon-mmd.

## License

[AGPL-3.0-or-later](LICENSE)
