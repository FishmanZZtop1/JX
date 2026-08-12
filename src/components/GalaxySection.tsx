import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import { fadeWindow } from "../sceneUtils";

const galaxyVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uTime;

  void main() {
    vec3 pos = position;
    float drift = sin(uTime * 0.18 + aPhase) * 0.036;
    pos.x += drift * (0.52 + abs(position.z) * 0.045);
    pos.y += cos(uTime * 0.13 + aPhase * 1.27) * 0.018;
    pos.z += cos(uTime * 0.17 + aPhase * 1.17) * 0.04;

    vColor = color;
    float twinkle = 0.66 + sin(uTime * (0.32 + aPhase * 0.01) + aPhase) * 0.34;
    vAlpha = aAlpha * uOpacity * twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float depthScale = clamp(54.0 / max(20.0, -mvPosition.z), 0.62, 2.65);
    gl_PointSize = max(1.0, aSize * uPixelRatio * depthScale);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const galaxyFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float radius = length(uv);
    if (radius > 0.5) discard;
    float core = 1.0 - smoothstep(0.012, 0.16, radius);
    float glow = pow(1.0 - smoothstep(0.05, 0.5, radius), 1.9);
    float alpha = (core * 0.86 + glow * 0.25) * vAlpha;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(vColor * (1.02 + core * 0.72), alpha);
  }
`;

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u = Math.max(0.0001, rand());
  const v = Math.max(0.0001, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function createGalaxyGeometry(count: number) {
  const rand = seeded(650311);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const mode = rand();
    let x = 0;
    let y = 0;
    let z = 0;
    let radius = 0;

    if (mode < 0.52) {
      radius = Math.pow(rand(), 0.78) * 15.5;
      const angle = rand() * Math.PI * 2;
      x = Math.cos(angle) * radius * 1.22 - 1.5;
      z = Math.sin(angle) * radius * 0.42 + Math.sin((x + 2.0) * 0.3) * 0.22;
      y = gaussian(rand) * (0.035 + radius * 0.012);
    } else if (mode < 0.86) {
      const arm = i % 4;
      radius = 0.6 + Math.pow(rand(), 0.64) * 15.2;
      const angle = (arm / 4) * Math.PI * 2 + radius * 0.48 + gaussian(rand) * (0.08 + radius * 0.014);
      x = Math.cos(angle) * radius * 1.28 - 1.35;
      z = Math.sin(angle) * radius * 0.44 + Math.sin(radius * 0.42 + arm) * 0.18;
      y = gaussian(rand) * (0.028 + radius * 0.01);
    } else if (mode < 0.94) {
      radius = Math.pow(rand(), 0.5) * 12.5;
      const angle = rand() * Math.PI * 2;
      x = Math.cos(angle) * radius * 1.36 - 1.5;
      z = Math.sin(angle) * radius * 0.52 + gaussian(rand) * 0.22;
      y = gaussian(rand) * (0.08 + radius * 0.02);
    } else {
      radius = Math.pow(rand(), 2.25) * 3.2;
      const angle = rand() * Math.PI * 2;
      x = -3.25 + Math.cos(angle) * radius * 1.18 + gaussian(rand) * 0.18;
      z = 0.44 + Math.sin(angle) * radius * 0.62;
      y = gaussian(rand) * 0.13;
    }

    const lane = Math.abs(z + 0.42 + Math.sin((x + 1.8) * 0.52) * 0.42) < 0.22 && x > -7.5 && x < 7.5;
    const farFade = THREE.MathUtils.clamp(1 - Math.abs(x) / 20, 0.18, 1);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const core = mode >= 0.94 || Math.hypot(x + 3.25, (z - 0.44) * 1.6) < 2.0;
    const whiteArm = mode >= 0.52 && mode < 0.86 && rand() > 0.18;
    const youngBlue = !core && rand() > 0.62;
    const dusty = lane && rand() > 0.34;
    color.set(
      core
        ? "#ffe2a8"
        : whiteArm
          ? "#f4f9ff"
          : youngBlue
            ? "#9ccfff"
            : rand() > 0.72
              ? "#d7edff"
              : "#c7d4dc",
    );
    color.multiplyScalar((dusty ? 0.08 + rand() * 0.08 : core ? 0.78 + rand() * 0.72 : 0.36 + rand() * 0.76) * farFade);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = core ? 0.78 + rand() * 1.8 : 0.2 + rand() * (whiteArm ? 0.82 : 0.56);
    alphas[i] = dusty ? 0.02 + rand() * 0.04 : core ? 0.22 + rand() * 0.34 : 0.12 + rand() * (whiteArm ? 0.36 : 0.24);
    phases[i] = rand() * 100;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  return geometry;
}

function galaxyOpacity() {
  return fadeWindow(flightRuntime.progress, 0.16, 0.26, 0.37, 0.43);
}

export default function GalaxySection() {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const low =
      window.matchMedia("(max-width: 760px)").matches ||
      window.matchMedia("(pointer: coarse)").matches ||
      (navigator.hardwareConcurrency || 8) <= 4;
    return createGalaxyGeometry(low ? 16000 : 76000);
  }, []);
  const uniforms = useMemo(
    () => ({
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(1.35, window.devicePixelRatio || 1) },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const opacity = galaxyOpacity();
    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.01;
      const settle = THREE.MathUtils.smoothstep(flightRuntime.progress, 0.28, 0.44);
      groupRef.current.rotation.y = -0.38 + settle * 0.12 + clock.elapsedTime * 0.018;
      groupRef.current.rotation.x = 0.62 - settle * 0.1;
      groupRef.current.rotation.z = -0.16 + clock.elapsedTime * 0.013;
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(1.46, 1.94, settle));
    }
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uOpacity.value = opacity * (flightRuntime.lowPerformance ? 1.35 : 2.15);
      material.uniforms.uTime.value = clock.elapsedTime;
      pointsRef.current.rotation.y = clock.elapsedTime * 0.018;
    }
  });

  return (
    <>
      <group ref={groupRef} position={[4.35, -0.74, -68.0]} rotation={[0.62, -0.38, -0.16]} scale={1.46}>
        <points ref={pointsRef} geometry={geometry} renderOrder={2}>
          <shaderMaterial
            args={[
              {
                vertexShader: galaxyVertexShader,
                fragmentShader: galaxyFragmentShader,
                uniforms,
                vertexColors: true,
                transparent: true,
                depthWrite: false,
                depthTest: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
              },
            ]}
          />
        </points>
      </group>
    </>
  );
}
