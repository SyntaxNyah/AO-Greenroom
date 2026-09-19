// Pure-Dart model for the AO2 3D `camera.json` sidecar.
// Mirrors aolib-meta `schemas/assets/CameraRig.schema.json`.
// Drop into lib/src/core/camera_rig.dart (no Flutter imports).

import 'dart:convert';

/// A camera framing, normalized to character height. Every field is optional
/// and overrides the resolved default.
class Pose {
  final double? targetY;
  final double? distance;
  final double? yaw;
  final double? pitch;
  final double? fov;

  const Pose({this.targetY, this.distance, this.yaw, this.pitch, this.fov});

  Map<String, dynamic> toJson() => {
        if (targetY != null) 'targetY': targetY,
        if (distance != null) 'distance': distance,
        if (yaw != null) 'yaw': yaw,
        if (pitch != null) 'pitch': pitch,
        if (fov != null) 'fov': fov,
      };

  factory Pose.fromJson(Map<String, dynamic> json) => Pose(
        targetY: (json['targetY'] as num?)?.toDouble(),
        distance: (json['distance'] as num?)?.toDouble(),
        yaw: (json['yaw'] as num?)?.toDouble(),
        pitch: (json['pitch'] as num?)?.toDouble(),
        fov: (json['fov'] as num?)?.toDouble(),
      );
}

/// Easing for a keyed (animated) camera clip.
enum CameraEasing { linear, easeIn, easeOut, easeInOut }

String easingToName(CameraEasing e) => switch (e) {
      CameraEasing.linear => 'linear',
      CameraEasing.easeIn => 'easeIn',
      CameraEasing.easeOut => 'easeOut',
      CameraEasing.easeInOut => 'easeInOut',
    };

CameraEasing easingFromName(Object? name) => switch (name) {
      'linear' => CameraEasing.linear,
      'easeIn' => CameraEasing.easeIn,
      'easeOut' => CameraEasing.easeOut,
      _ => CameraEasing.easeInOut,
    };

/// A [Pose] at a point in time (`t` normalized 0..1 across the driving motion).
class Keyframe extends Pose {
  final double t;

  const Keyframe({
    required this.t,
    super.targetY,
    super.distance,
    super.yaw,
    super.pitch,
    super.fov,
  });

  @override
  Map<String, dynamic> toJson() => {'t': t, ...super.toJson()};

  factory Keyframe.fromJson(Map<String, dynamic> json) => Keyframe(
        t: (json['t'] as num).toDouble(),
        targetY: (json['targetY'] as num?)?.toDouble(),
        distance: (json['distance'] as num?)?.toDouble(),
        yaw: (json['yaw'] as num?)?.toDouble(),
        pitch: (json['pitch'] as num?)?.toDouble(),
        fov: (json['fov'] as num?)?.toDouble(),
      );
}

/// A camera clip: either a static [Pose] or a keyed [KeyedClip].
sealed class Clip {
  Map<String, dynamic> toJson();

  factory Clip.fromJson(Map<String, dynamic> json) => json.containsKey('keys')
      ? KeyedClip.fromJson(json)
      : PoseClip(Pose.fromJson(json));
}

class PoseClip extends Clip {
  final Pose pose;
  PoseClip(this.pose);

  @override
  Map<String, dynamic> toJson() => pose.toJson();
}

class KeyedClip extends Clip {
  final List<Keyframe> keys;
  final CameraEasing easing;

  KeyedClip(this.keys, {this.easing = CameraEasing.easeInOut});

  @override
  Map<String, dynamic> toJson() => {
        'keys': keys.map((k) => k.toJson()).toList(),
        if (easing != CameraEasing.easeInOut) 'easing': easingToName(easing),
      };

  factory KeyedClip.fromJson(Map<String, dynamic> json) => KeyedClip(
        (json['keys'] as List)
            .map((e) => Keyframe.fromJson(e as Map<String, dynamic>))
            .toList(),
        easing: easingFromName(json['easing']),
      );
}

/// Camera for one emote: a `loop` (idle/talking) and/or `preanim` one-shot.
class EmoteCamera {
  final Clip? loop;
  final Clip? preanim;

  EmoteCamera({this.loop, this.preanim});

  Map<String, dynamic> toJson() => {
        if (loop != null) 'loop': loop!.toJson(),
        if (preanim != null) 'preanim': preanim!.toJson(),
      };

  factory EmoteCamera.fromJson(Map<String, dynamic> json) => EmoteCamera(
        loop: json['loop'] == null
            ? null
            : Clip.fromJson(json['loop'] as Map<String, dynamic>),
        preanim: json['preanim'] == null
            ? null
            : Clip.fromJson(json['preanim'] as Map<String, dynamic>),
      );
}

/// The camera.json document: a `default` resting shot plus per-emote cameras.
class CameraRig {
  final Clip? defaultClip;
  final Map<String, EmoteCamera> emotes;

  CameraRig({this.defaultClip, Map<String, EmoteCamera>? emotes})
      : emotes = emotes ?? {};

  Map<String, dynamic> toJson() => {
        if (defaultClip != null) 'default': defaultClip!.toJson(),
        if (emotes.isNotEmpty)
          'emotes': emotes.map((k, v) => MapEntry(k, v.toJson())),
      };

  factory CameraRig.fromJson(Map<String, dynamic> json) => CameraRig(
        defaultClip: json['default'] == null
            ? null
            : Clip.fromJson(json['default'] as Map<String, dynamic>),
        emotes: (json['emotes'] as Map<String, dynamic>? ?? {}).map(
          (k, v) => MapEntry(
            k as String,
            EmoteCamera.fromJson(v as Map<String, dynamic>),
          ),
        ),
      );

  String toJsonString() => const JsonEncoder.withIndent('  ').convert(toJson());

  factory CameraRig.fromJsonString(String text) =>
      CameraRig.fromJson(jsonDecode(text) as Map<String, dynamic>);
}
