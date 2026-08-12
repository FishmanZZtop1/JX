import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flightRuntime } from "../flightStore";
import { fadeWindow } from "../sceneUtils";

function nebulaOpacity() {
  return (1 - fadeWindow(flightRuntime.progress, 0.1, 0.205, 1, 1.01)) * 0.34;
}

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uAspect;
  uniform vec2 uMouse;
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

  float fbm3(vec2 p) {
    float value = 0.0;
    float amp = 0.55;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      value += noise(p) * amp;
      p = r * p * 2.04 + 7.13;
      amp *= 0.5;
    }
    return value;
  }

  vec2 rot(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c) * p;
  }

  float ellipse(vec2 p, vec2 center, vec2 radius, float angle) {
    vec2 q = rot(p - center, angle) / radius;
    return length(q);
  }

  float capsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  float softCapsule(vec2 p, vec2 a, vec2 b, float r, float blur) {
    return smoothstep(blur, -blur, capsule(p, a, b, r));
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uAspect;
    p += vec2(uMouse.x * -0.018, uMouse.y * -0.014);

    float t = uTime * 0.045;
    float breath = sin(t * 1.24) * 0.026 + sin(t * 0.53) * 0.018;
    p = rot(p, sin(t * 0.36) * 0.02);
    p.y *= 1.0 + breath;

    vec2 flow = vec2(
      fbm3(p * 1.2 + vec2(t * 0.42, -t * 0.3)),
      fbm3(p * 1.45 + vec2(-t * 0.36, t * 0.44) + 4.2)
    ) - 0.5;
    vec2 wp = p + flow * 0.2;

    float upper = ellipse(wp, vec2(-0.08, 0.12), vec2(0.58, 0.5), -0.12);
    float lower = ellipse(wp, vec2(0.06, -0.42), vec2(0.36, 0.48), 0.05);
    float tail = ellipse(wp, vec2(-0.12, -0.78), vec2(0.24, 0.38), -0.2);
    float sideSweep = softCapsule(wp, vec2(-0.5, -0.12), vec2(-0.86, -0.48), 0.18, 0.22);
    float rightVeil = softCapsule(wp, vec2(0.24, 0.0), vec2(0.66, -0.38), 0.2, 0.2);

    float broad = fbm3(wp * 2.15 + vec2(t * 0.3, -t * 0.22));
    float fine = fbm3(wp * 5.1 + flow * 2.2 + vec2(-t * 0.5, t * 0.4));
    float filament = pow(abs(fbm3(vec2(wp.x * 4.5 + broad * 1.2, wp.y * 7.2 - t * 0.95)) - 0.5) * 2.0, 0.45);

    float shellRadius = 0.78 + (broad - 0.5) * 0.18;
    float shell = smoothstep(0.13, 0.018, abs(upper - shellRadius));
    shell *= smoothstep(-0.72, -0.1, wp.x) * (1.0 - smoothstep(0.72, 1.06, wp.y));
    shell *= 0.34 + filament * 0.22;

    float mist = smoothstep(1.18, 0.12, upper) * 0.38;
    mist += smoothstep(1.06, 0.12, lower) * 0.45;
    mist += smoothstep(1.02, 0.12, tail) * 0.28;
    mist += sideSweep * 0.28 + rightVeil * 0.3;

    float blueColumn = softCapsule(wp, vec2(0.05, 0.1), vec2(0.03, -0.66), 0.13, 0.14);
    float violetTail = softCapsule(wp, vec2(-0.03, -0.48), vec2(-0.17, -0.93), 0.11, 0.12);
    float topPlume = softCapsule(wp, vec2(-0.08, 0.38), vec2(0.0, 0.02), 0.13, 0.14);
    float centralCloud = softCapsule(wp, vec2(0.0, 0.3), vec2(0.0, -0.72), 0.24, 0.28);
    mist += centralCloud * 0.54;

    float rightGalaxy = softCapsule(wp, vec2(1.18, 0.72), vec2(0.62, -0.38), 0.1, 0.28);
    float rightGalaxyCore = softCapsule(wp, vec2(1.04, 0.48), vec2(0.7, -0.18), 0.045, 0.11);
    float rightGalaxyDust = softCapsule(wp, vec2(1.12, 0.62), vec2(0.68, -0.28), 0.055, 0.08);
    float rightGalaxyKnots = smoothstep(0.62, 0.96, fbm3(vec2(wp.x * 12.0 + t * 0.8, wp.y * 18.0 - t * 0.4))) * rightGalaxy;

    float core = 1.0 - ellipse(wp, vec2(0.1, -0.5), vec2(0.19, 0.14), 0.2);
    core = pow(smoothstep(0.0, 0.92, core), 1.45);
    float lowerCore = 1.0 - ellipse(wp, vec2(-0.06, -0.75), vec2(0.1, 0.18), -0.18);
    lowerCore = pow(smoothstep(0.0, 0.86, lowerCore), 1.6);
    float emberKnot = 1.0 - ellipse(wp, vec2(0.38, -0.64), vec2(0.08, 0.055), -0.22);
    emberKnot = smoothstep(0.0, 0.78, emberKnot);

    float dust = 0.0;
    dust += softCapsule(wp, vec2(-0.06, 0.46), vec2(0.02, 0.08), 0.08, 0.07) * 1.15;
    dust += softCapsule(wp, vec2(0.12, 0.08), vec2(0.18, -0.3), 0.065, 0.07) * 0.82;
    dust += softCapsule(wp, vec2(-0.04, -0.18), vec2(-0.2, -0.68), 0.08, 0.08) * 0.72;
    dust += smoothstep(0.62, 0.9, fine) * mist * 0.38;
    dust = clamp(dust, 0.0, 1.0);

    vec3 sky = vec3(0.008, 0.009, 0.03);
    sky += vec3(0.12, 0.05, 0.25) * smoothstep(1.16, 0.18, length(p - vec2(0.36, 0.02))) * 0.42;
    sky += vec3(0.02, 0.18, 0.34) * smoothstep(1.12, 0.12, length(p - vec2(-0.1, -0.18))) * 0.28;

    vec3 deepViolet = vec3(0.16, 0.05, 0.34);
    vec3 cobalt = vec3(0.04, 0.17, 0.58);
    vec3 cyan = vec3(0.08, 0.58, 0.88);
    vec3 magenta = vec3(0.95, 0.12, 0.72);
    vec3 hotPink = vec3(1.0, 0.42, 0.9);
    vec3 ember = vec3(1.0, 0.26, 0.08);
    vec3 amber = vec3(0.92, 0.54, 0.18);

    float density = clamp(mist * (0.46 + broad * 0.62) + shell * 0.22 + blueColumn * 0.58 + violetTail * 0.42 + core * 0.92 + lowerCore * 0.44 + rightGalaxy * 0.42, 0.0, 1.0);
    vec3 color = sky;
    color += deepViolet * mist * (0.38 + broad * 0.38);
    color += mix(cobalt, cyan, smoothstep(0.26, 0.92, fine)) * (mist * 0.48 + blueColumn * 0.88);
    color += magenta * (violetTail * 0.72 + sideSweep * 0.32 + rightVeil * 0.34 + topPlume * 0.2);
    color += amber * shell * (0.16 + filament * 0.18);
    color += hotPink * core * 0.92;
    color += ember * (core * 0.28 + lowerCore * 0.34 + emberKnot * 0.72);
    color += cyan * shell * 0.12;
    color += mix(cobalt, magenta, 0.38) * centralCloud * (0.28 + fine * 0.34);
    color += vec3(0.9, 0.55, 0.22) * rightGalaxyCore * 0.95;
    color += vec3(0.08, 0.48, 1.0) * rightGalaxyKnots * 0.72;
    color += vec3(0.84, 0.78, 0.58) * rightGalaxy * (0.16 + broad * 0.22);
    float ridge = pow(1.0 - smoothstep(0.04, 0.28, abs(fine - 0.5)), 1.6);
    color += smoothstep(0.66, 0.96, fine) * (mist + blueColumn + violetTail) * vec3(0.28, 0.18, 0.48);
    color += ridge * (centralCloud + blueColumn + violetTail + shell) * vec3(0.34, 0.16, 0.42);
    color *= 1.0 - dust * 0.78;
    color *= 1.0 - rightGalaxyDust * 0.36;

    vec2 grid = uv * vec2(720.0, 420.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float seed = hash(cell);
    float starMask = step(0.825, seed);
    float starCore = smoothstep(0.12, 0.0, length(local));
    float starHalo = smoothstep(0.34, 0.0, length(local)) * step(0.983, seed);
    float starCross = (smoothstep(0.028, 0.0, abs(local.x)) + smoothstep(0.028, 0.0, abs(local.y))) * step(0.995, seed);
    float twinkle = 0.68 + sin(uTime * (0.34 + seed * 1.24) + seed * 58.0) * 0.32;
    vec3 starColor = mix(vec3(0.86, 0.92, 1.0), vec3(1.0, 0.58, 0.94), hash(cell + 7.1));
    color += starColor * (starMask * starCore * 2.8 + starHalo * 0.64 + starCross * 0.18) * twinkle;

    color *= 1.18;
    color = color / (vec3(1.0) + color * 0.34);
    color = pow(max(color, vec3(0.0)), vec3(0.86));

    float edgeFade =
      smoothstep(0.0, 0.04, uv.x) *
      smoothstep(1.0, 0.96, uv.x) *
      smoothstep(0.0, 0.04, uv.y) *
      smoothstep(1.0, 0.96, uv.y);
    float alpha = edgeFade * clamp(0.78 + density * 0.22 + starMask * starCore * 0.08, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

const sparkVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform vec2 uMouse;

  void main() {
    vColor = color;
    vec3 pos = position;
    float drift = sin(uTime * 0.13 + aPhase) * 0.04;
    pos.x += drift + uMouse.x * 0.2;
    pos.y += cos(uTime * 0.11 + aPhase * 1.37) * 0.035 + uMouse.y * 0.14;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float twinkle = 0.74 + sin(uTime * (0.42 + aPhase * 0.015) + aPhase) * 0.26;
    vAlpha = aAlpha * uOpacity * twinkle;
    gl_PointSize = max(1.0, aSize * uPixelRatio * clamp(46.0 / max(24.0, -mvPosition.z), 0.75, 1.8));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const sparkFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float radius = length(uv);
    if (radius > 0.5) discard;
    float core = 1.0 - smoothstep(0.02, 0.19, radius);
    float halo = pow(1.0 - smoothstep(0.1, 0.5, radius), 1.8);
    gl_FragColor = vec4(vColor * (1.0 + core * 0.55), (core * 0.7 + halo * 0.3) * vAlpha);
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

function createSparkGeometry(count: number) {
  const rand = seeded(20260605);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const alphas = new Float32Array(count);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const mode = rand();
    let x = 0;
    let y = 0;

    if (mode < 0.42) {
      y = 0.34 - rand() * 1.22;
      x = Math.sin((y + 0.5) * 7.8) * 0.08 + gaussian(rand) * 0.075;
    } else if (mode < 0.68) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      x = 0.1 + Math.cos(a) * r * 0.22;
      y = -0.5 + Math.sin(a) * r * 0.16;
    } else if (mode < 0.86) {
      const a = -0.15 + rand() * Math.PI * 1.45;
      const r = 0.46 + gaussian(rand) * 0.055;
      x = -0.08 + Math.cos(a) * r * 0.95;
      y = 0.12 + Math.sin(a) * r * 0.8;
    } else {
      y = -0.38 - rand() * 0.55;
      x = -0.12 + gaussian(rand) * 0.09;
    }

    positions[i * 3] = x * 34;
    positions[i * 3 + 1] = y * 30;
    positions[i * 3 + 2] = (rand() - 0.5) * 0.9;

    const tint = rand();
    color.set(tint > 0.72 ? "#ff72de" : tint > 0.42 ? "#8fdcff" : "#fff2ff");
    color.multiplyScalar(0.58 + rand() * 0.74);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.72 + rand() * (rand() > 0.965 ? 2.6 : 1.25);
    phases[i] = rand() * 100;
    alphas[i] = 0.13 + rand() * 0.52;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  return geometry;
}

function createFilamentGeometry(count: number) {
  const rand = seeded(20260606);
  const positions = new Float32Array(count * 2 * 3);
  const colors = new Float32Array(count * 2 * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const mode = rand();
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = 0;

    if (mode < 0.48) {
      y = 0.22 - rand() * 1.05;
      x = Math.sin((y + 0.62) * 8.2) * 0.09 + gaussian(rand) * 0.055;
      dx = 0.045 + gaussian(rand) * 0.025;
      dy = -0.06 - rand() * 0.08;
    } else if (mode < 0.76) {
      const a = -0.2 + rand() * Math.PI * 1.3;
      const r = 0.42 + gaussian(rand) * 0.045;
      x = -0.08 + Math.cos(a) * r * 0.95;
      y = 0.12 + Math.sin(a) * r * 0.78;
      dx = -Math.sin(a) * 0.08;
      dy = Math.cos(a) * 0.06;
    } else {
      y = -0.48 - rand() * 0.45;
      x = -0.1 + gaussian(rand) * 0.07;
      dx = 0.035 + gaussian(rand) * 0.03;
      dy = -0.08 - rand() * 0.08;
    }

    const x1 = x * 34;
    const y1 = y * 30;
    const x2 = (x + dx) * 34;
    const y2 = (y + dy) * 30;
    const z = (rand() - 0.5) * 0.7;

    positions[i * 6] = x1;
    positions[i * 6 + 1] = y1;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x2;
    positions[i * 6 + 4] = y2;
    positions[i * 6 + 5] = z + (rand() - 0.5) * 0.12;

    const tint = rand();
    color.set(tint > 0.72 ? "#ff5ed8" : tint > 0.44 ? "#7bd7ff" : "#ff7a5f");
    color.multiplyScalar(0.42 + rand() * 0.55);
    colors[i * 6] = color.r;
    colors[i * 6 + 1] = color.g;
    colors[i * 6 + 2] = color.b;
    colors[i * 6 + 3] = color.r;
    colors[i * 6 + 4] = color.g;
    colors[i * 6 + 5] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function NebulaFilamentLayer() {
  const linesRef = useRef<THREE.LineSegments>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const low =
      window.matchMedia("(max-width: 760px)").matches ||
      window.matchMedia("(pointer: coarse)").matches ||
      (navigator.hardwareConcurrency || 8) <= 4;
    return createFilamentGeometry(low ? 120 : 340);
  }, []);

  useFrame(({ clock }) => {
    const opacity = nebulaOpacity();
    if (linesRef.current) {
      linesRef.current.visible = opacity > 0.01;
      linesRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.07) * 0.015;
      linesRef.current.position.x = flightRuntime.mouseX * 0.16;
      linesRef.current.position.y = -0.02 + flightRuntime.mouseY * 0.11;
    }
    if (materialRef.current) {
      materialRef.current.opacity = opacity * (flightRuntime.lowPerformance ? 0.045 : 0.075);
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry} position={[0, -0.02, -81.1]} renderOrder={-3}>
      <lineBasicMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

function NebulaSparkLayer() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const low =
      window.matchMedia("(max-width: 760px)").matches ||
      window.matchMedia("(pointer: coarse)").matches ||
      (navigator.hardwareConcurrency || 8) <= 4;
    return createSparkGeometry(low ? 900 : 2400);
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(1.4, window.devicePixelRatio || 1) },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const opacity = nebulaOpacity();
    if (pointsRef.current) {
      pointsRef.current.visible = opacity > 0.01;
      pointsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.018;
    }
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uOpacity.value = opacity * (flightRuntime.lowPerformance ? 0.48 : 0.68);
    materialRef.current.uniforms.uMouse.value.set(flightRuntime.mouseX, flightRuntime.mouseY);
  });

  return (
    <points ref={pointsRef} geometry={geometry} position={[0, -0.02, -81.2]} renderOrder={-4}>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            vertexShader: sparkVertexShader,
            fragmentShader: sparkFragmentShader,
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

export default function NebulaSection() {
  const { size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const opacity = nebulaOpacity();
    if (meshRef.current) {
      meshRef.current.visible = opacity > 0.01;
    }
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uOpacity.value = opacity * (flightRuntime.lowPerformance ? 0.88 : 1);
    materialRef.current.uniforms.uAspect.value = Math.max(0.7, Math.min(2.1, size.width / Math.max(1, size.height)));
    materialRef.current.uniforms.uMouse.value.set(flightRuntime.mouseX, flightRuntime.mouseY);
  });

  return (
    <>
      <mesh ref={meshRef} position={[0, -0.02, -120]} rotation={[0.004, -0.014, 0]} renderOrder={-6}>
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
              depthTest: false,
              blending: THREE.NormalBlending,
              toneMapped: false,
            },
          ]}
        />
      </mesh>
      <NebulaFilamentLayer />
      <NebulaSparkLayer />
    </>
  );
}
