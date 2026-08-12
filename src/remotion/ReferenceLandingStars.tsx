import { AbsoluteFill } from "remotion";

type ReferenceGlint = {
  x: number;
  pathY: number;
  peak: number;
  scale: number;
  repeats?: number;
};

type ReferencePin = {
  x: number;
  pathY: number;
  peak: number;
  size: number;
  alpha: number;
  color: string;
  pulseWidth: number;
};

type GalaxyBreath = {
  pathY: number;
  peak: number;
  width: number;
  alpha: number;
};

const REFERENCE_SECONDS = 3;
const REFERENCE_WIDTH = 592;
const REFERENCE_SKY_HEIGHT = 550;

// Positions and peak frames are traced from the user's 90-frame reference clip.
const REFERENCE_GLINTS: ReferenceGlint[] = [
  glint(94, 45, 37, 0.92),
  glint(58, 77, 10, 1.08),
  glint(143, 85, 19, 1.16),
  glint(55, 103, 14, 0.82),
  glint(111, 96, 9, 0.96),
  glint(115, 126, 21, 0.82),
  glint(143, 143, 2, 1.08),
  glint(47, 198, 52, 0.92),
  glint(87, 210, 39, 0.9),
  glint(452, 45, 38, 1.14),
  glint(316, 70, 49, 1.18),
  glint(309, 105, 0, 0.98),
  glint(546, 116, 70, 1.2),
  glint(567, 165, 27, 1.04, 2),
  glint(577, 234, 0, 0.94),
  glint(474, 316, 48, 0.96),
  glint(417, 330, 37, 0.82),
  glint(55, 329, 32, 0.94),
  glint(541, 404, 10, 1.13, 2),
  glint(509, 404, 64, 0.78),
  glint(19, 483, 40, 1.05, 2),
  glint(154, 491, 59, 0.72),
  glint(443, 538, 59, 0.9),
];

const FIELD_PINS = makeFieldPins(138, 6312026);
const GALAXY_PINS = makeGalaxyPins(2600, 6312027);
const GALAXY_CLUSTERS = [
  ...makeSparkCluster(112, 6312031, 0.13, 0.075, 0.11, 0.2),
  ...makeSparkCluster(76, 6312032, 0.48, 0.068, 0.095, 0.5),
  ...makeSparkCluster(96, 6312033, 0.82, 0.07, 0.1, 0.96),
];
const GALAXY_GLINTS = makeGalaxyGlints(42, 6312028);
const MOBILE_GALAXY_PINS = makeGalaxyPins(5200, 6312127);
const MOBILE_GALAXY_CLUSTERS = [
  ...makeSparkCluster(230, 6312131, 0.13, 0.13, 0.11, 0.2),
  ...makeSparkCluster(170, 6312132, 0.48, 0.115, 0.095, 0.5),
  ...makeSparkCluster(200, 6312133, 0.82, 0.12, 0.1, 0.96),
];
const MOBILE_GALAXY_GLINTS = makeGalaxyGlints(88, 6312128);
const GALAXY_BREATHS: GalaxyBreath[] = [
  { pathY: 0.08, peak: 0.14, width: 0.16, alpha: 0.08 },
  { pathY: 0.25, peak: 0.26, width: 0.2, alpha: 0.07 },
  { pathY: 0.47, peak: 0.48, width: 0.24, alpha: 0.065 },
  { pathY: 0.69, peak: 0.7, width: 0.22, alpha: 0.075 },
  { pathY: 0.88, peak: 0.94, width: 0.18, alpha: 0.085 },
];

export function ReferenceLandingStars({
  seconds,
  width,
  height,
  skySpan,
  variant = "desktop",
}: {
  seconds: number;
  width: number;
  height: number;
  skySpan: number;
  variant?: "desktop" | "mobile";
}) {
  const progress = positiveModulo(seconds, REFERENCE_SECONDS) / REFERENCE_SECONDS;
  const unit = Math.min(width, height);
  const mobile = variant === "mobile";
  const galaxyPins = mobile ? MOBILE_GALAXY_PINS : GALAXY_PINS;
  const galaxyClusters = mobile ? MOBILE_GALAXY_CLUSTERS : GALAXY_CLUSTERS;
  const galaxyGlints = mobile ? MOBILE_GALAXY_GLINTS : GALAXY_GLINTS;
  const galaxySizeScale = mobile ? 0.52 : 0.66;
  const galaxyGlintScale = mobile ? 0.52 : 0.7;
  const galaxyBrightness = mobile ? 1.55 : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <GalaxyBreathLayer
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        intensity={mobile ? 1.18 : 1}
      />
      <PinLayer
        pins={FIELD_PINS}
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        unit={unit}
      />
      <PinLayer
        pins={galaxyPins}
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        unit={unit}
        galaxy
        sizeScale={galaxySizeScale}
        brightnessScale={galaxyBrightness}
        minimumSize={mobile ? 1.35 : 0}
      />
      <PinLayer
        pins={galaxyClusters}
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        unit={unit}
        galaxy
        sizeScale={galaxySizeScale}
        brightnessScale={galaxyBrightness}
        minimumSize={mobile ? 1.35 : 0}
      />
      <GlintLayer
        glints={galaxyGlints}
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        unit={unit}
        compact
        compactScale={galaxyGlintScale}
        brightnessScale={galaxyBrightness}
      />
      <GlintLayer
        glints={REFERENCE_GLINTS}
        progress={progress}
        width={width}
        height={height}
        skySpan={skySpan}
        unit={unit}
      />
    </AbsoluteFill>
  );
}

function GalaxyBreathLayer({
  progress,
  width,
  height,
  skySpan,
  intensity,
}: {
  progress: number;
  width: number;
  height: number;
  skySpan: number;
  intensity: number;
}) {
  return (
    <>
      {GALAXY_BREATHS.map((breath, index) => {
        const pulse = circularPulse(progress, breath.peak, 0.28);
        const x = galaxyCenterX(breath.pathY);
        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: x * width,
              top: breath.pathY * skySpan * height,
              width: width * breath.width,
              height: height * skySpan * breath.width * 0.38,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(230,235,255,0.42) 0%, rgba(129,146,255,0.14) 38%, transparent 74%)",
              filter: "blur(15px)",
              opacity: breath.alpha * intensity * (0.45 + pulse * 0.55),
              transform: `translate3d(-50%, -50%, 0) rotate(57deg) scale3d(${0.94 + pulse * 0.08}, ${0.96 + pulse * 0.06}, 1)`,
            }}
          />
        );
      })}
    </>
  );
}

function PinLayer({
  pins,
  progress,
  width,
  height,
  skySpan,
  unit,
  galaxy = false,
  sizeScale = 1,
  brightnessScale = 1,
  minimumSize = 0,
}: {
  pins: ReferencePin[];
  progress: number;
  width: number;
  height: number;
  skySpan: number;
  unit: number;
  galaxy?: boolean;
  sizeScale?: number;
  brightnessScale?: number;
  minimumSize?: number;
}) {
  return (
    <>
      {pins.map((pin, index) => {
        const pulse = circularPulse(progress, pin.peak, pin.pulseWidth);
        const visiblePulse = Math.sqrt(pulse);
        const opacity = Math.min(
          1,
          pin.alpha * ((galaxy ? 0.24 : 0.035) + visiblePulse * (galaxy ? 0.76 : 0.84)) *
            brightnessScale,
        );
        const naturalSize = unit * pin.size * sizeScale * (0.92 + pulse * 0.12);
        const size = Math.max(minimumSize, naturalSize);
        const glow = Math.max(
          size * 2.1,
          unit * pin.size * sizeScale * (galaxy ? 3.45 : 2.8) * (0.5 + visiblePulse * 0.9),
        );
        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: pin.x * width,
              top: pin.pathY * skySpan * height,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: pin.color,
              boxShadow: `0 0 ${glow}px ${pin.color}`,
              opacity,
              transform: "translate3d(-50%, -50%, 0)",
            }}
          />
        );
      })}
    </>
  );
}

function GlintLayer({
  glints,
  progress,
  width,
  height,
  skySpan,
  unit,
  compact = false,
  compactScale = 0.7,
  brightnessScale = 1,
}: {
  glints: ReferenceGlint[];
  progress: number;
  width: number;
  height: number;
  skySpan: number;
  unit: number;
  compact?: boolean;
  compactScale?: number;
  brightnessScale?: number;
}) {
  return (
    <>
      {glints.map((star, index) => {
        const repeats = star.repeats ?? 1;
        const repeatedProgress = positiveModulo(progress * repeats, 1);
        const repeatedPeak = positiveModulo(star.peak * repeats, 1);
        const pulse = circularPulse(repeatedProgress, repeatedPeak, compact ? 0.3 : 0.4);
        const visiblePulse = Math.sqrt(pulse);
        const opacity = Math.min(
          1,
          ((compact ? 0.045 : 0.04) + visiblePulse * (compact ? 0.91 : 0.96)) *
            brightnessScale,
        );
        const resolvedScale = compact ? compactScale : 1;
        const core =
          unit * (compact ? 0.00145 : 0.00182) * resolvedScale * star.scale *
          (0.9 + visiblePulse * 0.14);
        const ray =
          unit * (compact ? 0.028 : 0.052) * resolvedScale * star.scale *
          (0.52 + visiblePulse * 0.5);
        const rayThickness = Math.max(
          compact ? 0.9 : 1.35,
          unit * (compact ? 0.00115 : 0.0017) * resolvedScale,
        );
        const halo = ray * (compact ? 1.05 : 1.18);
        const x = star.x * width;
        const y = star.pathY * skySpan * height;

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: core,
              height: core,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: `0 0 ${unit * (compact ? 0.0068 : 0.009) * resolvedScale * (0.5 + visiblePulse)}px rgba(180,205,255,0.92)`,
              opacity,
              transform: "translate3d(-50%, -50%, 0)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: halo,
                height: halo,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(153,187,255,0.2) 24%, transparent 68%)",
                opacity: 0.16 + visiblePulse * 0.48,
                transform: "translate3d(-50%, -50%, 0)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: ray,
                height: rayThickness,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(186,210,255,0.48) 24%, #ffffff 50%, rgba(186,210,255,0.48) 76%, transparent 100%)",
                transform: "translate3d(-50%, -50%, 0)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: rayThickness,
                height: ray,
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(186,210,255,0.48) 24%, #ffffff 50%, rgba(186,210,255,0.48) 76%, transparent 100%)",
                transform: "translate3d(-50%, -50%, 0)",
              }}
            />
          </span>
        );
      })}
    </>
  );
}

function glint(
  x: number,
  y: number,
  peakFrame: number,
  scale: number,
  repeats = 1,
): ReferenceGlint {
  return {
    x: x / REFERENCE_WIDTH,
    pathY: y / REFERENCE_SKY_HEIGHT,
    peak: peakFrame / 90,
    scale,
    repeats,
  };
}

function makeFieldPins(count: number, seed: number): ReferencePin[] {
  const random = seeded(seed);
  const colors = ["#ffffff", "#eef4ff", "#d8e5ff", "#d9d4ff"];
  const pins: ReferencePin[] = [];

  while (pins.length < count) {
    const pathY = 0.025 + random() * 0.93;
    const x = 0.018 + random() * 0.964;
    const bandDistance = Math.abs(x - galaxyCenterX(pathY));
    if (bandDistance < 0.09 + Math.sin(pathY * Math.PI) * 0.035) continue;
    const rare = random() > 0.91;
    pins.push({
      x,
      pathY,
      peak: random(),
      size: rare ? 0.00245 + random() * 0.00055 : 0.00118 + random() * 0.00072,
      alpha: rare ? 0.88 + random() * 0.12 : 0.46 + random() * 0.38,
      color: colors[Math.floor(random() * colors.length)],
      pulseWidth: 0.12 + random() * 0.1,
    });
  }

  return pins;
}

function makeGalaxyPins(count: number, seed: number): ReferencePin[] {
  const random = seeded(seed);
  const colors = ["#ffffff", "#ffffff", "#f7f8ff", "#e7edff", "#d9dcff"];

  return Array.from({ length: count }, (_, index) => {
    const pathY = 0.012 + random() * 0.95;
    const edgeTaper = Math.sin(Math.max(0, Math.min(1, pathY)) * Math.PI);
    const spread = 0.024 + edgeTaper * 0.055;
    const x = galaxyCenterX(pathY) + (random() + random() - 1) * spread;
    const rare = random() > 0.965;
    const group = Math.floor(pathY * 6) / 6;
    const peak = positiveModulo(0.08 + group * 0.86 + (random() - 0.5) * 0.08, 1);

    return {
      x: Math.max(0.008, Math.min(0.82, x)),
      pathY,
      peak,
      size: rare ? 0.00305 + random() * 0.00072 : 0.0013 + random() * 0.00092,
      alpha: rare ? 0.96 : 0.68 + random() * 0.3,
      color: colors[Math.floor(random() * colors.length)],
      pulseWidth: 0.17 + random() * 0.07,
    };
  });
}

function makeSparkCluster(
  count: number,
  seed: number,
  centerPathY: number,
  radiusX: number,
  radiusY: number,
  peak: number,
): ReferencePin[] {
  const random = seeded(seed);
  const centerX = galaxyCenterX(centerPathY);
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const rare = random() > 0.91;
    return {
      x: Math.max(0.008, Math.min(0.82, centerX + Math.cos(angle) * radiusX * radius)),
      pathY: Math.max(0.008, Math.min(0.98, centerPathY + Math.sin(angle) * radiusY * radius)),
      peak: positiveModulo(peak + (random() - 0.5) * 0.075, 1),
      size: rare ? 0.0048 + random() * 0.0017 : 0.0024 + random() * 0.002,
      alpha: rare ? 1 : 0.78 + random() * 0.22,
      color: random() > 0.2 ? "#ffffff" : "#e7edff",
      pulseWidth: 0.2 + random() * 0.055,
    };
  });
}

function makeGalaxyGlints(count: number, seed: number): ReferenceGlint[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    const pathY = 0.02 + ((index + random() * 0.7) / count) * 0.94;
    const spread = 0.016 + Math.sin(pathY * Math.PI) * 0.035;
    return {
      x: Math.max(
        0.01,
        Math.min(0.82, galaxyCenterX(pathY) + (random() - 0.5) * spread),
      ),
      pathY,
      peak: positiveModulo(0.06 + pathY * 0.9 + (random() - 0.5) * 0.075, 1),
      scale: 0.38 + random() * 0.36,
    };
  });
}

function galaxyCenterX(pathY: number) {
  const t = Math.max(0, Math.min(1, pathY));
  return 0.055 + t * 0.51 + Math.sin(t * Math.PI * 1.35) * 0.024;
}

function circularPulse(progress: number, peak: number, radius: number) {
  const direct = Math.abs(progress - peak);
  const distance = Math.min(direct, 1 - direct);
  const value = Math.max(0, 1 - distance / radius);
  return value * value * (3 - 2 * value);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function seeded(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
