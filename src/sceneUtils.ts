import * as THREE from "three";

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const x = clamp((value - edge0) / Math.max(0.00001, edge1 - edge0));
  return x * x * (3 - 2 * x);
}

export function fadeWindow(
  progress: number,
  fadeInStart: number,
  fadeInEnd: number,
  fadeOutStart: number,
  fadeOutEnd: number,
) {
  return (
    smoothstep(fadeInStart, fadeInEnd, progress) *
    (1 - smoothstep(fadeOutStart, fadeOutEnd, progress))
  );
}

export function mixVectors(
  target: THREE.Vector3,
  a: THREE.Vector3Tuple,
  b: THREE.Vector3Tuple,
  t: number,
) {
  target.set(
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  );
}

export function earthSceneLanding(progress: number) {
  return smoothstep(0.7, 0.8, progress);
}

export function earthHandoff(progress: number) {
  return Math.pow(smoothstep(0.44, 0.76, progress), 2.1);
}

export function earthSceneDescent(progress: number) {
  return smoothstep(0.815, 0.925, progress);
}

export function earthScenePosition(target: THREE.Vector3, progress: number, compact = false) {
  const landing = earthSceneLanding(progress);
  const descent = earthSceneDescent(progress);
  const halfY = compact ? -4.05 : -4.42;
  const centeredY = compact ? -0.34 : -0.12;
  const descentY = compact ? -7.25 : -9.08;
  const centeredZ = compact ? -126.35 : -126.05;
  target.set(
    THREE.MathUtils.lerp(0, compact ? -0.08 : 0, descent),
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(halfY, centeredY, landing), descentY, descent),
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(-124.2, centeredZ, landing), compact ? -129.1 : -130.65, descent),
  );
  return target;
}

export function earthSceneScale(progress: number, compact = false) {
  const landing = earthSceneLanding(progress);
  const descent = earthSceneDescent(progress);
  const halfScale = compact ? 2.16 : 2.78;
  const centeredScale = compact ? 1.48 : 2.05;
  const descentScale = compact ? 4.16 : 5.35;
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(halfScale, centeredScale, landing), descentScale, descent);
}

const earthCinematicPosition = new THREE.Vector3();

export function earthTrackedWorldPosition(target: THREE.Vector3, progress: number, compact = false) {
  target.set(
    compact ? 3.0707454771 : 0.7067734277,
    compact ? 1.8749317911 : 1.0296496251,
    compact ? -82.6653821599 : -79.0386453227,
  );
  earthScenePosition(earthCinematicPosition, progress, compact);
  target.lerp(earthCinematicPosition, earthHandoff(progress));
  return target;
}

export function earthTrackedWorldScale(progress: number, compact = false) {
  const previewScale = compact ? 0.0065 : 0.0075;
  return THREE.MathUtils.lerp(previewScale, earthSceneScale(progress, compact), earthHandoff(progress));
}

export type CameraKeyframe = {
  progress: number;
  position: THREE.Vector3Tuple;
  target: THREE.Vector3Tuple;
  fov: number;
};

// Edit these keyframes to change the scroll-driven camera path.
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  {
    progress: 0,
    position: [0, 0.2, 22],
    target: [0.4, 0, 0],
    fov: 42,
  },
  {
    progress: 0.22,
    position: [-5.2, 2.8, -18],
    target: [0.5, 0.2, -38],
    fov: 48,
  },
  {
    progress: 0.39,
    position: [4.8, 2.0, -61],
    target: [0.2, -0.08, -78],
    fov: 44,
  },
  {
    progress: 0.53,
    position: [3.25, 1.1, -72.4],
    target: [2.85, -0.08, -86.2],
    fov: 41,
  },
  {
    progress: 0.68,
    position: [0, 1.02, -113.1],
    target: [0, -1.18, -124.2],
    fov: 40,
  },
  {
    progress: 0.82,
    position: [0, 0.84, -114.0],
    target: [0, -0.36, -125.1],
    fov: 39,
  },
  {
    progress: 0.91,
    position: [0, 0.82, -115.05],
    target: [0, -2.4, -128.25],
    fov: 46,
  },
  {
    progress: 1,
    position: [0, 0.62, -115.4],
    target: [0, -8.2, -130.65],
    fov: 58,
  },
];

export function cameraSegment(progress: number) {
  for (let index = 0; index < CAMERA_KEYFRAMES.length - 1; index += 1) {
    const from = CAMERA_KEYFRAMES[index];
    const to = CAMERA_KEYFRAMES[index + 1];
    if (progress >= from.progress && progress <= to.progress) {
      const local = smoothstep(from.progress, to.progress, progress);
      return { from, to, local };
    }
  }

  const lastIndex = CAMERA_KEYFRAMES.length - 2;
  return {
    from: CAMERA_KEYFRAMES[lastIndex],
    to: CAMERA_KEYFRAMES[lastIndex + 1],
    local: progress >= 1 ? 1 : 0,
  };
}
