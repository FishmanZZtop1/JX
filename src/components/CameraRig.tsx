import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import {
  cameraSegment,
  earthSceneDescent,
  earthHandoff,
  earthSceneLanding,
  earthTrackedWorldPosition,
  mixVectors,
  smoothstep,
} from "../sceneUtils";

const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const mouseOffset = new THREE.Vector3();
const earthPosition = new THREE.Vector3();
const earthFollowTarget = new THREE.Vector3();
const earthFollowCamera = new THREE.Vector3();

function focusFollowStrength(progress: number) {
  const nebula = (1 - smoothstep(0.3, 0.4, progress)) * 0.24;
  const galaxy = smoothstep(0.16, 0.26, progress) * (1 - smoothstep(0.46, 0.58, progress)) * 0.34;
  return Math.min(1, Math.max(nebula, galaxy));
}

export default function CameraRig() {
  const { camera } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const smoothProgress = useRef(0);
  const smoothMouse = useRef(new THREE.Vector2());

  useFrame(({ clock }, delta) => {
    const progressDamping = flightRuntime.reducedMotion ? 9 : 7.4;
    smoothProgress.current = THREE.MathUtils.damp(
      smoothProgress.current,
      flightRuntime.progress,
      progressDamping,
      delta,
    );

    const mouseDamping = flightRuntime.reducedMotion ? 10 : 5.2;
    smoothMouse.current.x = THREE.MathUtils.damp(
      smoothMouse.current.x,
      flightRuntime.mouseX,
      mouseDamping,
      delta,
    );
    smoothMouse.current.y = THREE.MathUtils.damp(
      smoothMouse.current.y,
      flightRuntime.mouseY,
      mouseDamping,
      delta,
    );

    const { from, to, local } = cameraSegment(smoothProgress.current);
    mixVectors(cameraPosition, from.position, to.position, local);
    mixVectors(cameraTarget, from.target, to.target, local);

    const earthTrack = smoothstep(0.29, 0.36, smoothProgress.current) * (1 - smoothstep(0.94, 0.99, smoothProgress.current));
    if (earthTrack > 0.001) {
      const earthProgress = flightRuntime.progress;
      const handoff = earthHandoff(earthProgress);
      const landing = earthSceneLanding(earthProgress);
      const descent = earthSceneDescent(earthProgress);
      const previewDistance = 4.8;
      const previewHalfWidth =
        Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov * 0.5)) *
        previewDistance *
        perspectiveCamera.aspect;
      const previewCompositionOffset =
        previewHalfWidth * 0.36 * (1 - smoothstep(0.54, 0.7, earthProgress));
      earthTrackedWorldPosition(earthPosition, earthProgress, flightRuntime.lowPerformance);
      earthFollowTarget.set(
        earthPosition.x - previewCompositionOffset,
        earthPosition.y + THREE.MathUtils.lerp(0.05, THREE.MathUtils.lerp(3.22, -0.22, Math.max(landing, descent)), handoff),
        earthPosition.z,
      );
      earthFollowCamera.set(
        earthPosition.x - previewCompositionOffset,
        earthPosition.y + THREE.MathUtils.lerp(0.56, THREE.MathUtils.lerp(5.38, 1.02, landing) + descent * 0.38, handoff),
        earthPosition.z + THREE.MathUtils.lerp(4.8, THREE.MathUtils.lerp(10.72, 7.86, Math.max(landing, descent)), handoff),
      );
      cameraTarget.lerp(earthFollowTarget, earthTrack);
      cameraPosition.lerp(earthFollowCamera, earthTrack);
    }

    const motionScale = flightRuntime.reducedMotion ? 0.12 : 1;
    const followStrength = focusFollowStrength(smoothProgress.current);
    mouseOffset.set(
      smoothMouse.current.x * 0.72 * motionScale * followStrength,
      smoothMouse.current.y * 0.46 * motionScale * followStrength,
      (Math.abs(smoothMouse.current.x) + Math.abs(smoothMouse.current.y)) * 0.12 * motionScale * followStrength,
    );
    cameraPosition.add(mouseOffset);
    cameraTarget.add(mouseOffset.multiplyScalar(0.7));

    if (earthTrack > 0.995) {
      perspectiveCamera.position.copy(cameraPosition);
      lookTarget.copy(cameraTarget);
    } else {
      perspectiveCamera.position.lerp(cameraPosition, 1 - Math.pow(0.001, delta));
      lookTarget.lerp(cameraTarget, 1 - Math.pow(0.002, delta));
    }
    perspectiveCamera.lookAt(lookTarget);
    perspectiveCamera.rotation.z = THREE.MathUtils.damp(
      perspectiveCamera.rotation.z,
      smoothMouse.current.x * -0.015 * motionScale * followStrength,
      4,
      delta,
    );

    perspectiveCamera.fov = THREE.MathUtils.damp(
      perspectiveCamera.fov,
      THREE.MathUtils.lerp(from.fov, to.fov, local),
      4,
      delta,
    );
    perspectiveCamera.updateProjectionMatrix();
  });

  return null;
}
