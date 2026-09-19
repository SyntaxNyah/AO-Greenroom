// Auto-framing, expressed as a height-normalized camera.json Pose. Mirrors the
// bias in LemmyAO's `frameFromSkeleton`: feet sit near the bottom of the view,
// with ~18% headroom for hair/hats. Because a Pose is normalized to the
// character's own height, the same default works across models of any scale.

import type { Pose } from "../model/project";

export interface YExtent {
  minY: number;
  maxY: number;
}

/**
 * Computes the resting default pose from the skeleton's vertical extent.
 * `fovDeg` is the vertical field of view in degrees.
 */
export function autoFramePose(fovDeg: number, minY: number, maxY: number): Pose {
  const charHeight = Math.max(maxY - minY, 1e-3);
  const headroom = charHeight * 0.18;
  const feetPad = charHeight * 0.04;
  const viewTop = maxY + headroom;
  const viewBottom = minY - feetPad;
  const centerY = (viewTop + viewBottom) / 2;
  const framedHeight = viewTop - viewBottom;

  const fovRad = (fovDeg * Math.PI) / 180;
  const distance = framedHeight / 2 / Math.tan(fovRad / 2) / charHeight;
  const targetY = (centerY - minY) / charHeight;

  return { targetY, distance, yaw: 0, pitch: 0, fov: fovDeg };
}
