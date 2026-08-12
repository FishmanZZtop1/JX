import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import { smoothstep } from "../sceneUtils";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.03 + 17.7;
      a *= 0.5;
    }
    return v;
  }

  vec3 palette(float t) {
    vec3 blue = vec3(0.06, 0.22, 0.78);
    vec3 violet = vec3(0.44, 0.1, 0.78);
    vec3 magenta = vec3(0.92, 0.1, 0.62);
    vec3 ember = vec3(0.82, 0.18, 0.08);
    vec3 cyan = vec3(0.06, 0.72, 0.92);
    vec3 a = mix(blue, violet, smoothstep(0.05, 0.5, t));
    vec3 b = mix(magenta, ember, smoothstep(0.48, 0.96, t));
    return mix(a, b, smoothstep(0.38, 0.86, t)) + cyan * smoothstep(0.56, 0.88, t) * 0.18;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= 1.72;

    float slow = uTime * 0.018;
    float broad = fbm(p * 2.0 + vec2(-slow, slow * 0.6));
    float veil = fbm(p * 5.2 + vec2(slow * 0.5, -slow));
    float filament = fbm(vec2(p.x * 8.4 + broad * 1.2, p.y * 3.2 - slow));
    float colorMix = clamp(broad * 0.68 + veil * 0.34 + p.x * 0.12 - p.y * 0.08, 0.0, 1.0);

    float gas = smoothstep(0.22, 0.94, broad) * 0.54 + smoothstep(0.48, 0.9, veil) * 0.32;
    gas += smoothstep(0.7, 0.94, filament) * 0.28;
    float dust = smoothstep(0.42, 0.72, fbm(p * 7.0 + 9.4));
    gas *= 1.0 - dust * 0.42;

    vec3 color = palette(colorMix) * gas;
    color += vec3(0.07, 0.2, 0.52) * smoothstep(0.08, 0.85, broad);
    color += vec3(0.56, 0.04, 0.34) * smoothstep(0.62, 0.92, veil) * 0.82;

    vec2 starGrid = uv * vec2(560.0, 315.0);
    vec2 cell = floor(starGrid);
    vec2 local = fract(starGrid) - 0.5;
    float starSeed = hash(cell);
    float starMask = step(0.9935, starSeed);
    float starCore = smoothstep(0.05, 0.0, length(local));
    float twinkle = 0.72 + 0.28 * sin(uTime * (0.5 + starSeed * 1.8) + starSeed * 32.0);
    vec3 starColor = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.75, 0.96), hash(cell + 4.1));
    color += starColor * starMask * starCore * twinkle * 1.6;

    float vignette = smoothstep(0.92, 0.14, length(p * vec2(0.9, 1.12)));
    color *= 0.9 + vignette * 0.78;
    color *= 1.18;
    color = color / (vec3(1.0) + color * 0.22);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

function backdropOpacity() {
  const early = (1 - smoothstep(0.22, 0.34, flightRuntime.progress)) * 0.3;
  return early;
}

export default function DeepSpaceBackdrop() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const opacity = backdropOpacity() * (flightRuntime.lowPerformance ? 0.72 : 1);
    mesh.visible = opacity > 0.01;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uOpacity.value = opacity;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -126]} rotation={[0, 0, 0.04]}>
      <planeGeometry args={[220, 128, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader,
            fragmentShader,
            uniforms,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          },
        ]}
      />
    </mesh>
  );
}
