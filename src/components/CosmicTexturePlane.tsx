import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";

const cosmicPlaneVertexShader = `
  uniform float uTime;
  uniform float uCurve;
  uniform float uBreath;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    vec2 centered = uv - 0.5;
    float softBend = dot(centered, centered);
    p.z += softBend * uCurve;
    p.xy *= 1.0 + sin(uTime * 0.08 + softBend * 4.0) * uBreath;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const cosmicPlaneFragmentShader = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uHighlightRolloff;
  uniform float uAlphaFloor;
  uniform float uAlphaCeil;
  uniform float uAlphaMode;
  uniform float uFlow;
  uniform float uGlow;
  uniform float uPulse;
  uniform float uPulseSpeed;
  uniform float uRadiance;
  uniform float uPointSuppression;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;
  uniform vec3 uColorBalance;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
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
    float value = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.78, 0.62, -0.62, 0.78);
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p = rot * p * 2.01 + 9.7;
      amp *= 0.5;
    }
    return value;
  }

  vec3 saturateColor(vec3 color, float saturation) {
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(grey), color, saturation);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float flow = fbm(centered * 4.8 + vec2(uTime * 0.018, -uTime * 0.012));
    vec2 uv = (vUv - 0.5) / uUvScale + 0.5 + uUvOffset;
    uv += (flow - 0.5) * uFlow;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      discard;
    }

    vec3 sampled = texture2D(uMap, uv).rgb;
    if (uPointSuppression > 0.0) {
      vec2 px = vec2(0.0018, 0.0018);
      float lumaCenter = max(max(sampled.r, sampled.g), sampled.b);
      vec3 sampleRight = texture2D(uMap, uv + vec2(px.x, 0.0)).rgb;
      vec3 sampleLeft = texture2D(uMap, uv - vec2(px.x, 0.0)).rgb;
      vec3 sampleTop = texture2D(uMap, uv + vec2(0.0, px.y)).rgb;
      vec3 sampleBottom = texture2D(uMap, uv - vec2(0.0, px.y)).rgb;
      float lumaNear =
        max(max(sampleRight.r, sampleRight.g), sampleRight.b) +
        max(max(sampleLeft.r, sampleLeft.g), sampleLeft.b) +
        max(max(sampleTop.r, sampleTop.g), sampleTop.b) +
        max(max(sampleBottom.r, sampleBottom.g), sampleBottom.b);
      lumaNear *= 0.25;
      float isolatedPoint = smoothstep(0.05, 0.18, lumaCenter - lumaNear) * smoothstep(0.46, 0.9, lumaCenter);
      vec3 softenedPoint = (sampleRight + sampleLeft + sampleTop + sampleBottom) * 0.25;
      sampled = mix(sampled, softenedPoint, isolatedPoint * uPointSuppression * 0.68);
    }
    float edgeFade =
      smoothstep(0.0, 0.16, uv.x) *
      smoothstep(1.0, 0.84, uv.x) *
      smoothstep(0.0, 0.16, uv.y) *
      smoothstep(1.0, 0.84, uv.y);
    float luma = max(max(sampled.r, sampled.g), sampled.b);
    float vignette = smoothstep(0.88, 0.18, length(centered * vec2(1.05, 1.0)));
    float lumaAlpha = smoothstep(uAlphaFloor, uAlphaCeil, luma);
    float alpha = mix(1.0, lumaAlpha, step(0.5, uAlphaMode));
    alpha = mix(alpha, alpha * vignette, step(1.5, uAlphaMode));
    float coreBreath = 0.5 + 0.5 * sin(uTime * uPulseSpeed + flow * 2.4 + luma * 2.0);
    float sweepAxis = dot(centered, normalize(vec2(0.82, -0.28)));
    float sweep = smoothstep(0.34, 0.0, abs(sweepAxis - sin(uTime * uPulseSpeed * 0.32) * 0.28));
    sweep *= smoothstep(0.78, 0.1, length(centered));

    vec3 color = saturateColor(sampled, uSaturation);
    color *= uColorBalance;
    color = (color - 0.5) * uContrast + 0.5;
    color *= uBrightness * (0.98 + flow * 0.18 + lumaAlpha * coreBreath * uPulse * 0.2);
    color += color * lumaAlpha * uGlow * (0.82 + coreBreath * 0.22);
    color += sampled * (sweep * uRadiance * 0.16 + lumaAlpha * coreBreath * uRadiance * 0.2);
    color = max(color, vec3(0.0));
    color = color / (vec3(1.0) + color * uHighlightRolloff);

    gl_FragColor = vec4(color, alpha * edgeFade * uOpacity * (1.0 + lumaAlpha * coreBreath * uPulse * 0.08));
  }
`;

type CosmicTexturePlaneProps = {
  src: string;
  position: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  size: [number, number];
  opacity: () => number;
  alphaMode?: "full" | "luma" | "soft";
  alphaFloor?: number;
  alphaCeil?: number;
  brightness?: number;
  saturation?: number;
  contrast?: number;
  highlightRolloff?: number;
  colorBalance?: [number, number, number];
  uvScale?: [number, number];
  uvOffset?: [number, number];
  flow?: number;
  glow?: number;
  pulse?: number;
  pulseSpeed?: number;
  radiance?: number;
  pointSuppression?: number;
  curve?: number;
  breath?: number;
  spinSpeed?: number;
  wobble?: number;
  additive?: boolean;
};

function alphaModeValue(mode: "full" | "luma" | "soft") {
  if (mode === "luma") return 1;
  if (mode === "soft") return 2;
  return 0;
}

export default function CosmicTexturePlane({
  src,
  position,
  rotation = [0, 0, 0],
  size,
  opacity,
  alphaMode = "full",
  alphaFloor = 0.12,
  alphaCeil = 0.72,
  brightness = 1,
  saturation = 1,
  contrast = 1,
  highlightRolloff = 0.2,
  colorBalance = [1, 1, 1],
  uvScale = [1, 1],
  uvOffset = [0, 0],
  flow = 0.003,
  glow = 0.08,
  pulse = 0.08,
  pulseSpeed = 0.5,
  radiance = 0.08,
  pointSuppression = 0,
  curve = -0.25,
  breath = 0.002,
  spinSpeed = 0,
  wobble = 0,
  additive = false,
}: CosmicTexturePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uBrightness: { value: brightness },
      uSaturation: { value: saturation },
      uContrast: { value: contrast },
      uHighlightRolloff: { value: highlightRolloff },
      uAlphaFloor: { value: alphaFloor },
      uAlphaCeil: { value: alphaCeil },
      uAlphaMode: { value: alphaModeValue(alphaMode) },
      uFlow: { value: flow },
      uGlow: { value: glow },
      uPulse: { value: pulse },
      uPulseSpeed: { value: pulseSpeed },
      uRadiance: { value: radiance },
      uPointSuppression: { value: pointSuppression },
      uCurve: { value: curve },
      uBreath: { value: breath },
      uUvScale: { value: new THREE.Vector2(uvScale[0], uvScale[1]) },
      uUvOffset: { value: new THREE.Vector2(uvOffset[0], uvOffset[1]) },
      uColorBalance: { value: new THREE.Vector3(colorBalance[0], colorBalance[1], colorBalance[2]) },
    }),
    [
      alphaCeil,
      alphaFloor,
      alphaMode,
      breath,
      brightness,
      colorBalance,
      contrast,
      curve,
      flow,
      glow,
      highlightRolloff,
      pulse,
      pulseSpeed,
      pointSuppression,
      radiance,
      saturation,
      texture,
      uvOffset,
      uvScale,
    ],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const currentOpacity = opacity() * (flightRuntime.lowPerformance ? 0.88 : 1);
    mesh.visible = currentOpacity > 0.006;
    mesh.rotation.set(
      rotation[0] + Math.sin(clock.elapsedTime * 0.07) * wobble,
      rotation[1] + Math.cos(clock.elapsedTime * 0.06) * wobble * 0.7,
      rotation[2] + clock.elapsedTime * spinSpeed,
    );
    material.uniforms.uOpacity.value = currentOpacity;
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={[size[0], size[1], 18, 18]} />
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader: cosmicPlaneVertexShader,
            fragmentShader: cosmicPlaneFragmentShader,
            uniforms,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
            toneMapped: false,
          },
        ]}
      />
    </mesh>
  );
}
