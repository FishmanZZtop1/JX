import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";

const plateVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plateFragmentShader = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uLift;
  uniform float uHighlightRolloff;
  uniform vec3 uColorBalance;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;
  varying vec2 vUv;

  vec3 saturateColor(vec3 color, float saturation) {
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(grey), color, saturation);
  }

  void main() {
    vec2 uv = (vUv - 0.5) / uUvScale + 0.5 + uUvOffset;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      discard;
    }
    vec4 sampled = texture2D(uMap, uv);
    vec3 color = saturateColor(sampled.rgb, uSaturation) * uBrightness;
    color *= uColorBalance;
    color = (color - 0.5) * uContrast + 0.5 + uLift;
    color = max(color, vec3(0.0));
    color = color / (vec3(1.0) + color * uHighlightRolloff);
    gl_FragColor = vec4(color, sampled.a * uOpacity);
  }
`;

type CinematicPlateProps = {
  src: string;
  position: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  size: [number, number];
  opacity: () => number;
  brightness?: number;
  saturation?: number;
  contrast?: number;
  lift?: number;
  highlightRolloff?: number;
  colorBalance?: [number, number, number];
  coverViewport?: boolean;
  coverPadding?: number;
  uvScale?: [number, number];
  uvOffset?: [number, number];
};

const planePosition = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();

export default function CinematicPlate({
  src,
  position,
  rotation = [0, 0, 0],
  size,
  opacity,
  brightness = 1,
  saturation = 1,
  contrast = 1,
  lift = 0,
  highlightRolloff = 0,
  colorBalance = [1, 1, 1],
  coverViewport = false,
  coverPadding = 1.16,
  uvScale = [1, 1],
  uvOffset = [0, 0],
}: CinematicPlateProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, size: viewportSize } = useThree();
  const texture = useTexture(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uOpacity: { value: 0 },
      uBrightness: { value: brightness },
      uSaturation: { value: saturation },
      uContrast: { value: contrast },
      uLift: { value: lift },
      uHighlightRolloff: { value: highlightRolloff },
      uColorBalance: { value: new THREE.Vector3(colorBalance[0], colorBalance[1], colorBalance[2]) },
      uUvScale: { value: new THREE.Vector2(uvScale[0], uvScale[1]) },
      uUvOffset: { value: new THREE.Vector2(uvOffset[0], uvOffset[1]) },
    }),
    [brightness, colorBalance, contrast, highlightRolloff, lift, saturation, texture, uvOffset, uvScale],
  );

  useFrame(() => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    material.uniforms.uOpacity.value = opacity() * (flightRuntime.lowPerformance ? 0.9 : 1);

    if (coverViewport && camera instanceof THREE.PerspectiveCamera) {
      mesh.getWorldPosition(planePosition);
      camera.getWorldDirection(cameraDirection);
      const depth = Math.max(0.1, planePosition.sub(camera.position).dot(cameraDirection));
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * depth;
      const viewWidth = viewHeight * (viewportSize.width / Math.max(1, viewportSize.height));
      const imageAspect = size[0] / size[1];
      let targetWidth = viewWidth * coverPadding;
      let targetHeight = targetWidth / imageAspect;

      if (targetHeight < viewHeight * coverPadding) {
        targetHeight = viewHeight * coverPadding;
        targetWidth = targetHeight * imageAspect;
      }

      mesh.scale.set(targetWidth / size[0], targetHeight / size[1], 1);
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader: plateVertexShader,
            fragmentShader: plateFragmentShader,
            uniforms,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            toneMapped: false,
          },
        ]}
      />
    </mesh>
  );
}
