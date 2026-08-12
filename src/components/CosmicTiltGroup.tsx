import { useFrame } from "@react-three/fiber";
import { ReactNode, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import { smoothstep } from "../sceneUtils";

type CosmicTiltGroupProps = {
  children: ReactNode;
};

function tiltStrength(progress: number) {
  const nebula = (1 - smoothstep(0.34, 0.48, progress)) * 0.92;
  const galaxy = smoothstep(0.16, 0.28, progress) * (1 - smoothstep(0.54, 0.68, progress));
  return Math.max(nebula, galaxy);
}

export default function CosmicTiltGroup({ children }: CosmicTiltGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothMouse = useRef(new THREE.Vector2());

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const motionScale = flightRuntime.reducedMotion ? 0.12 : 1;
    const strength = tiltStrength(flightRuntime.progress) * motionScale;
    smoothMouse.current.x = THREE.MathUtils.damp(smoothMouse.current.x, flightRuntime.mouseX, 4.2, delta);
    smoothMouse.current.y = THREE.MathUtils.damp(smoothMouse.current.y, flightRuntime.mouseY, 4.2, delta);

    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -smoothMouse.current.y * 0.036 * strength, 4.8, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, smoothMouse.current.x * 0.052 * strength, 4.8, delta);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, -smoothMouse.current.x * 0.008 * strength, 4.8, delta);
    group.position.x = THREE.MathUtils.damp(group.position.x, smoothMouse.current.x * 0.3 * strength, 4.2, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, smoothMouse.current.y * 0.18 * strength, 4.2, delta);
  });

  return <group ref={groupRef}>{children}</group>;
}
