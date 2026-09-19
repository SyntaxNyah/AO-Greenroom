# Pinsel reference files

These are ready-to-apply files for
[Pinsel-AO-Char-Maker](https://github.com/SyntaxNyah/Pinsel-AO-Char-Maker) so it
can read/write 3D characters losslessly (the `camera.json` sidecar and the
`[options] model` / `[emote <name>]` char.ini encoding).

- `camera_rig.dart` — drop into `lib/src/core/camera_rig.dart`. Pure Dart, no
  Flutter imports, mirrors `schemas/CameraRig.schema.json`.

See [`../docs/PINSEL_INTEGRATION.md`](../docs/PINSEL_INTEGRATION.md) for the
full change list.
