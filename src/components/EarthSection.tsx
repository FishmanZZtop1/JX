import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import {
  earthSceneDescent,
  earthHandoff,
  earthSceneLanding,
  earthTrackedWorldPosition,
  earthTrackedWorldScale,
  fadeWindow,
  smoothstep,
} from "../sceneUtils";

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const earthFragmentShader = `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform float uOpacity;
  uniform vec3 uLightDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    float daylight = max(dot(normal, normalize(uLightDirection)), 0.0);
    float night = pow(1.0 - daylight, 2.2);

    vec3 dayColor = texture2D(uDayMap, vUv).rgb;
    vec3 nightColor = texture2D(uNightMap, vUv).rgb;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.15);

    vec3 color = dayColor * (0.2 + daylight * 1.32);
    color += nightColor * night * 1.32;
    color += vec3(0.24, 0.55, 1.0) * fresnel * 0.42;
    color = pow(color, vec3(0.92));

    gl_FragColor = vec4(color, uOpacity);
  }
`;

const cloudFragmentShader = `
  uniform sampler2D uCloudMap;
  uniform float uOpacity;
  uniform vec3 uLightDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 sampleColor = texture2D(uCloudMap, vUv).rgb;
    float cloud = smoothstep(0.22, 0.86, max(max(sampleColor.r, sampleColor.g), sampleColor.b));
    vec3 normal = normalize(vWorldNormal);
    float daylight = max(dot(normal, normalize(uLightDirection)), 0.0);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.0);

    vec3 color = vec3(0.86, 0.94, 1.0) * (0.24 + daylight * 0.78 + rim * 0.24);
    gl_FragColor = vec4(color, cloud * uOpacity);
  }
`;

const atmosphereVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform float uOpacity;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(dot(viewDirection, normal), 0.0), 2.8);
    vec3 color = vec3(0.24, 0.58, 1.0) * rim;
    gl_FragColor = vec4(color, rim * uOpacity);
  }
`;

const lightDirection = new THREE.Vector3(-0.78, 0.28, 0.56).normalize();
const earthPosition = new THREE.Vector3();

export default function EarthSection() {
  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const dayTexture = useTexture("/scene-assets/earth_atmos_2048.jpg");
  const cloudTexture = useTexture("/scene-assets/earth_clouds_1024.png");
  const nightTexture = useTexture("/scene-assets/earth_lights_2048.png");

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  cloudTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  dayTexture.anisotropy = 8;
  cloudTexture.anisotropy = 4;
  nightTexture.anisotropy = 8;
  dayTexture.minFilter = THREE.LinearMipmapLinearFilter;
  dayTexture.magFilter = THREE.LinearFilter;
  cloudTexture.minFilter = THREE.LinearMipmapLinearFilter;
  cloudTexture.magFilter = THREE.LinearFilter;
  nightTexture.minFilter = THREE.LinearMipmapLinearFilter;
  nightTexture.magFilter = THREE.LinearFilter;

  const earthUniforms = useMemo(
    () => ({
      uDayMap: { value: dayTexture },
      uNightMap: { value: nightTexture },
      uOpacity: { value: 0 },
      uLightDirection: { value: lightDirection },
    }),
    [dayTexture, nightTexture],
  );
  const cloudUniforms = useMemo(
    () => ({
      uCloudMap: { value: cloudTexture },
      uOpacity: { value: 0 },
      uLightDirection: { value: lightDirection },
    }),
    [cloudTexture],
  );
  const atmosphereUniforms = useMemo(
    () => ({
      uOpacity: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const opacity = fadeWindow(flightRuntime.progress, 0.29, 0.36, 0.9, 0.97);
    const landing = earthSceneLanding(flightRuntime.progress);
    const descent = earthSceneDescent(flightRuntime.progress);
    const handoff = earthHandoff(flightRuntime.progress);
    const compact = flightRuntime.lowPerformance;

    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.01;
      groupRef.current.position.copy(earthTrackedWorldPosition(earthPosition, flightRuntime.progress, compact));
      groupRef.current.scale.setScalar(earthTrackedWorldScale(flightRuntime.progress, compact));
      groupRef.current.rotation.x = THREE.MathUtils.lerp(0.18, THREE.MathUtils.lerp(0.03, -0.16, landing) + descent * 0.08, handoff);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(-0.13, THREE.MathUtils.lerp(-0.06, 0.02, landing), handoff);
    }
    const rotateToChina = smoothstep(0.58, 0.78, flightRuntime.progress);
    if (earthRef.current) {
      const previewSpin = clock.elapsedTime * 0.055 * (1 - handoff);
      earthRef.current.rotation.y = THREE.MathUtils.lerp(-1.04 + previewSpin, -3.48, rotateToChina);
    }
    if (cloudRef.current) {
      const cloudDrift = (1 - landing) * clock.elapsedTime * 0.011;
      cloudRef.current.rotation.y = THREE.MathUtils.lerp(-0.96, -3.4, rotateToChina) + cloudDrift;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = clock.elapsedTime * 0.008;
    }

    const cloudDescentFade = 1 - smoothstep(0.79, 0.865, flightRuntime.progress);
    const atmosphereDescentFade = 1 - descent * 0.42;
    earthUniforms.uOpacity.value = opacity;
    cloudUniforms.uOpacity.value =
      opacity * THREE.MathUtils.lerp(0.026, 0.052, landing) * cloudDescentFade;
    atmosphereUniforms.uOpacity.value =
      opacity * THREE.MathUtils.lerp(0.15, 0.2, landing) * atmosphereDescentFade;
  });

  return (
    <group ref={groupRef} position={[4.15, -0.14, -124.2]} scale={1}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.72, 128, 96]} />
        <shaderMaterial
          args={[
            {
              vertexShader: earthVertexShader,
              fragmentShader: earthFragmentShader,
              uniforms: earthUniforms,
              transparent: true,
            },
          ]}
        />
      </mesh>
      <mesh ref={cloudRef} scale={1.01}>
        <sphereGeometry args={[1.72, 96, 64]} />
        <shaderMaterial
          args={[
            {
              vertexShader: earthVertexShader,
              fragmentShader: cloudFragmentShader,
              uniforms: cloudUniforms,
              transparent: true,
              depthWrite: false,
            },
          ]}
        />
      </mesh>
      <mesh ref={atmosphereRef} scale={1.028}>
        <sphereGeometry args={[1.72, 96, 64]} />
        <shaderMaterial
          args={[
            {
              vertexShader: atmosphereVertexShader,
              fragmentShader: atmosphereFragmentShader,
              uniforms: atmosphereUniforms,
              transparent: true,
              depthWrite: false,
              side: THREE.BackSide,
              blending: THREE.AdditiveBlending,
            },
          ]}
        />
      </mesh>
    </group>
  );
}
