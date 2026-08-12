import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import { smoothstep } from "../sceneUtils";

function starFollowStrength(progress: number) {
  const nebula = (1 - smoothstep(0.3, 0.4, progress)) * 0.28;
  const galaxy = smoothstep(0.16, 0.26, progress) * (1 - smoothstep(0.46, 0.58, progress)) * 0.34;
  const earthPreview = smoothstep(0.3, 0.38, progress) * (1 - smoothstep(0.82, 0.98, progress)) * 0.46;
  return Math.max(nebula, galaxy, earthPreview);
}

function transitionVeilOpacity(progress: number) {
  const nebulaToGalaxy = smoothstep(0.18, 0.25, progress) * (1 - smoothstep(0.33, 0.45, progress));
  const galaxyToEarth = smoothstep(0.3, 0.35, progress) * (1 - smoothstep(0.4, 0.48, progress));
  return Math.max(nebulaToGalaxy, galaxyToEarth);
}

function globalStarOpacity(progress: number) {
  const galaxy = smoothstep(0.28, 0.36, progress) * (1 - smoothstep(0.48, 0.6, progress)) * 0.7;
  const earthPreview = smoothstep(0.3, 0.38, progress) * (1 - smoothstep(0.78, 0.88, progress));
  const earth = smoothstep(0.58, 0.68, progress) * (1 - smoothstep(0.94, 0.995, progress)) * 0.9;
  return Math.max(galaxy, earthPreview, earth);
}

const starVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uTravel;
  uniform vec2 uMouse;

  void main() {
    vColor = color;
    float twinkle = 0.72 + sin(uTime * (0.62 + aPhase * 0.012) + aPhase) * 0.28;
    vAlpha = aAlpha * uOpacity * twinkle;
    float depthScale = 0.82 + position.z * 0.62;
    float flightScale = 1.0 + uTravel * (0.012 + position.z * 0.018);
    vec2 parallax = uMouse * (0.002 + position.z * 0.0035);
    gl_PointSize = max(1.15, aSize * uPixelRatio * depthScale * 1.42);
    gl_Position = vec4(position.xy * flightScale + parallax, 0.0, 1.0);
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float radius = length(uv);
    if (radius > 0.5) discard;
    float pin = 1.0 - smoothstep(0.02, 0.24, radius);
    float falloff = pow(1.0 - smoothstep(0.08, 0.5, radius), 1.55);
    float sparkle = pin * 0.82 + falloff * 0.18;
    float alpha = sparkle * vAlpha;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(vColor * (1.08 + pin * 0.58), alpha);
  }
`;

export default function StarField() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    const count = low ? 2600 : 6800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const alphas = new Float32Array(count);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 2.22;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 2.22;
      positions[index * 3 + 2] = Math.random();

      const tint = Math.random();
      color.set(tint > 0.84 ? "#c9e4ff" : tint > 0.58 ? "#d9b5ff" : "#fff7ef");
      color.multiplyScalar(0.86 + Math.random() * 0.86);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = 0.44 + Math.random() * (Math.random() > 0.974 ? 1.34 : 0.68);
      phases[index] = Math.random() * 100;
      alphas[index] = 0.66 + Math.random() * 0.88;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    buffer.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    buffer.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    buffer.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    return buffer;
  }, []);
  const uniforms = useMemo(
    () => ({
      uOpacity: { value: 0.82 },
      uPixelRatio: { value: Math.min(1.6, window.devicePixelRatio || 1) },
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const sceneOpacity = globalStarOpacity(flightRuntime.progress);
    pointsRef.current.visible = sceneOpacity > 0.01;
    if (sceneOpacity <= 0.01) return;
    const motionScale = flightRuntime.reducedMotion ? 0.15 : 1;
    const follow = starFollowStrength(flightRuntime.progress);
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uOpacity.value = sceneOpacity * (flightRuntime.reducedMotion ? 0.82 : 1.34);
      materialRef.current.uniforms.uTravel.value = smoothstep(0.3, 0.76, flightRuntime.progress);
      materialRef.current.uniforms.uMouse.value.set(
        flightRuntime.mouseX * motionScale * follow,
        flightRuntime.mouseY * motionScale * follow,
      );
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} renderOrder={-20} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            uniforms,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}

export function TransitionStarVeil() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    const count = low ? 1200 : 3400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const alphas = new Float32Array(count);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 2.26;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 2.26;
      positions[index * 3 + 2] = Math.random();
      const tint = Math.random();
      color.set(tint > 0.78 ? "#c8e0ff" : tint > 0.56 ? "#ffe2fb" : "#fff8e8");
      color.multiplyScalar(0.5 + Math.random() * 0.48);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = 0.22 + Math.random() * (Math.random() > 0.975 ? 0.64 : 0.36);
      phases[index] = Math.random() * 100;
      alphas[index] = 0.28 + Math.random() * 0.72;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    buffer.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    buffer.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    buffer.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    return buffer;
  }, []);
  const uniforms = useMemo(
    () => ({
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(1.6, window.devicePixelRatio || 1) },
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;
    const opacity = transitionVeilOpacity(flightRuntime.progress);
    points.visible = opacity > 0.01;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uTravel.value = smoothstep(0.26, 0.48, flightRuntime.progress) * 1.8;
    material.uniforms.uMouse.value.set(flightRuntime.mouseX * 0.22, flightRuntime.mouseY * 0.18);
    material.uniforms.uOpacity.value = opacity * (flightRuntime.lowPerformance ? 0.42 : 0.58);
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader: starVertexShader,
            fragmentShader: starFragmentShader,
            uniforms,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}
