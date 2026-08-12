import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type HomeStarflightMode = "idle" | "flight" | "reverse";

type HomeStarflightProps = {
  mode: HomeStarflightMode;
};

type BurstStar = {
  angle: number;
  depth: number;
  size: number;
  speed: number;
  alpha: number;
  tint: string;
  wobble: number;
};

type PinStar = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  tint: string;
};

const BACKGROUND = "scene-assets/home-nebula-bg.png";
const BURST_STARS = makeBurstStars(760);
const PIN_STARS = makePinStars(620);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);

function seeded(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBurstStars(count: number): BurstStar[] {
  const random = seeded(729416);
  const palette = ["#fff7ff", "#ffd1fa", "#b8d9ff", "#ff9ee5", "#f6f2ff", "#9fd4ff"];
  return Array.from({ length: count }, () => {
    const clusterBias = random() < 0.62 ? Math.sin(random() * Math.PI * 2) * 0.2 : 0;
    return {
      angle: random() * Math.PI * 2 + clusterBias,
      depth: random(),
      size: 0.7 + random() * (random() > 0.93 ? 2.7 : 1.2),
      speed: 0.72 + random() * 1.48,
      alpha: 0.28 + random() * 0.72,
      tint: palette[Math.floor(random() * palette.length)],
      wobble: random() * Math.PI * 2,
    };
  });
}

function makePinStars(count: number): PinStar[] {
  const random = seeded(39421);
  const palette = ["#fff8ff", "#ffbdf2", "#cfe7ff", "#fff0df", "#a8cfff"];
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    size: 0.75 + random() * (random() > 0.96 ? 2.4 : 1.15),
    alpha: 0.18 + random() * 0.54,
    phase: random() * Math.PI * 2,
    tint: palette[Math.floor(random() * palette.length)],
  }));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function loop01(value: number) {
  return value - Math.floor(value);
}

function softPulse(frame: number, fps: number) {
  const seconds = frame / fps;
  return Math.sin(seconds * 0.48) * 0.5 + Math.sin(seconds * 0.23 + 1.7) * 0.5;
}

function modeProgress(mode: HomeStarflightMode, frame: number, total: number) {
  const raw = clamp01(frame / Math.max(1, total - 1));
  if (mode === "idle") return raw;
  return mode === "reverse" ? 1 - raw : raw;
}

function backgroundStyle(mode: HomeStarflightMode, frame: number, fps: number, total: number): CSSProperties {
  const raw = clamp01(frame / Math.max(1, total - 1));
  const p = modeProgress(mode, frame, total);
  const pulse = softPulse(frame, fps);
  const drift = frame / fps;
  const flightEase = easeOut(p);
  const idleScale = 1.05 + pulse * 0.013;
  const flightScale = interpolate(flightEase, [0, 1], [1.045, 1.36]);
  const scale = mode === "idle" ? idleScale : flightScale;
  const x = mode === "idle" ? Math.sin(drift * 0.12) * 15 : interpolate(flightEase, [0, 1], [0, -92]);
  const y = mode === "idle" ? Math.cos(drift * 0.1 + 1.2) * 10 : interpolate(flightEase, [0, 1], [0, -24]);
  const rotate = mode === "idle" ? Math.sin(drift * 0.09) * 0.32 : interpolate(flightEase, [0, 1], [-0.18, 0.42]);
  const brightness = mode === "idle" ? 1.09 + pulse * 0.02 : interpolate(raw, [0, 0.2, 1], [1.08, 1.18, 1.12]);

  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: `brightness(${brightness}) saturate(1.22) contrast(1.03)`,
    transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
    transformOrigin: "50% 48%",
  };
}

function StarPinLayer({ frame, fps, width, height, mode }: { frame: number; fps: number; width: number; height: number; mode: HomeStarflightMode }) {
  const seconds = frame / fps;
  const opacity = mode === "idle" ? 0.82 : 0.62;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>
      {PIN_STARS.map((star, index) => {
        const twinkle = 0.58 + Math.sin(seconds * (0.35 + (index % 11) * 0.018) + star.phase) * 0.42;
        const drift = mode === "idle" ? seconds * 2.8 : seconds * 5.4;
        const x = loop01(star.x + Math.sin(seconds * 0.015 + star.phase) * 0.003) * width;
        const y = loop01(star.y + drift / height + Math.cos(seconds * 0.012 + star.phase) * 0.002) * height;
        const size = star.size * (mode === "idle" ? 1 : 0.85);
        return (
          <div
            key={`pin-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              background: star.tint,
              opacity: star.alpha * twinkle,
              boxShadow: `0 0 ${size * 2.6}px ${star.tint}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function StarBurstLayer({
  frame,
  fps,
  width,
  height,
  mode,
}: {
  frame: number;
  fps: number;
  width: number;
  height: number;
  mode: HomeStarflightMode;
}) {
  const raw = clamp01(frame / Math.max(1, 10 * fps - 1));
  const p = modeProgress(mode, frame, 10 * fps);
  const power = mode === "idle" ? 0.12 : interpolate(raw, [0, 0.12, 0.84, 1], [0.2, 1, 1, 0.78], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const centerX = width * 0.52;
  const centerY = height * 0.48;
  const maxRadius = Math.sqrt(width * width + height * height) * 0.72;

  return (
    <AbsoluteFill style={{ opacity: power, mixBlendMode: "screen" }}>
      {BURST_STARS.map((star, index) => {
        const phase = mode === "idle" ? loop01(star.depth + frame / fps * 0.014 * star.speed) : loop01(star.depth + p * 1.38 * star.speed);
        const radial = Math.pow(phase, mode === "idle" ? 1.2 : 1.82);
        const wobble = Math.sin(frame / fps * 0.28 + star.wobble) * (mode === "idle" ? 3 : 9) * phase;
        const angle = star.angle + wobble * 0.0018;
        const radius = (mode === "idle" ? 30 + radial * maxRadius * 0.08 : 8 + radial * maxRadius) * (0.82 + star.speed * 0.16);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.64;
        const near = Math.pow(phase, 1.6);
        const trail = mode === "idle" ? star.size * 1.6 : 8 + near * 92 * star.speed;
        const thickness = star.size * (mode === "idle" ? 0.72 : 0.7 + near * 1.45);
        const fadeIn = clamp01(phase / 0.1);
        const fadeOut = clamp01((1 - phase) / 0.2);
        const alpha = star.alpha * Math.min(fadeIn, fadeOut) * (mode === "idle" ? 0.2 : 0.95);
        const degrees = (angle * 180) / Math.PI;

        return (
          <div
            key={`burst-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: trail,
              height: thickness,
              marginLeft: -trail * 0.5,
              marginTop: -thickness * 0.5,
              borderRadius: 999,
              opacity: alpha,
              background:
                mode === "idle"
                  ? star.tint
                  : `linear-gradient(90deg, transparent 0%, ${star.tint} 52%, rgba(255,255,255,0.96) 100%)`,
              boxShadow: `0 0 ${8 + near * 18}px ${star.tint}`,
              transform: `rotate(${degrees}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function ColorPolish({ frame, fps, mode }: { frame: number; fps: number; mode: HomeStarflightMode }) {
  const pulse = softPulse(frame, fps);
  const flow = frame / fps;
  const flight = mode === "idle" ? 0 : clamp01(frame / Math.max(1, 10 * fps - 1));
  return (
    <>
      <AbsoluteFill
        style={{
          opacity: 0.56 + Math.max(0, pulse) * 0.08,
          background:
            "radial-gradient(ellipse at 50% 48%, rgba(122, 211, 255, 0.28), transparent 38%), radial-gradient(ellipse at 42% 62%, rgba(255, 78, 198, 0.24), transparent 31%), radial-gradient(ellipse at 83% 67%, rgba(255, 139, 216, 0.22), transparent 25%)",
          filter: "blur(22px)",
          mixBlendMode: "screen",
          transform: `translate3d(${Math.sin(flow * 0.12) * 18}px, ${Math.cos(flow * 0.11) * 14}px, 0) scale(${1.02 + flight * 0.05})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.28) 83%, rgba(0, 0, 0, 0.54) 100%), linear-gradient(90deg, rgba(0,0,0,0.18), transparent 28%, transparent 72%, rgba(0,0,0,0.16))",
        }}
      />
    </>
  );
}

export function HomeStarflight({ mode }: HomeStarflightProps) {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const bg = useMemo(() => staticFile(BACKGROUND), []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#03020a", overflow: "hidden" }}>
      <Img src={bg} style={backgroundStyle(mode, frame, fps, durationInFrames)} />
      <ColorPolish frame={frame} fps={fps} mode={mode} />
      <StarPinLayer frame={frame} fps={fps} width={width} height={height} mode={mode} />
      <StarBurstLayer frame={frame} fps={fps} width={width} height={height} mode={mode} />
    </AbsoluteFill>
  );
}
