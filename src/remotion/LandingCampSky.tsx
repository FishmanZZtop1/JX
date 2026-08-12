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

type SparkStar = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  halo: number;
};

const BACKGROUND = "scene-assets/landing-camp-bg.png";
const TWINKLE_STARS = makeStars(760);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

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

function makeStars(count: number): SparkStar[] {
  const random = seeded(911706);
  const palette = ["#ffffff", "#dceaff", "#b7d1ff", "#f2d7ff", "#ffd8bc"];
  return Array.from({ length: count }, () => {
    const skyBias = Math.pow(random(), 1.7);
    return {
      x: random(),
      y: random() * 0.72 + skyBias * 0.04,
      size: 0.8 + random() * (random() > 0.965 ? 2.2 : 1.1),
      alpha: 0.16 + random() * 0.68,
      phase: random() * Math.PI * 2,
      color: palette[Math.floor(random() * palette.length)],
      halo: 1.2 + random() * 4.4,
    };
  });
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function backgroundStyle(frame: number, fps: number): CSSProperties {
  const seconds = frame / fps;
  const pulse = Math.sin(seconds * 0.18) * 0.5 + Math.sin(seconds * 0.09 + 1.3) * 0.5;
  const scale = 1.032 + pulse * 0.008;
  const x = Math.sin(seconds * 0.055) * 10;
  const y = Math.cos(seconds * 0.045 + 0.8) * 6;

  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    filter: "brightness(1.03) saturate(1.08) contrast(1.02)",
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
    transformOrigin: "50% 45%",
  };
}

function TwinkleLayer({ frame, fps, width, height }: { frame: number; fps: number; width: number; height: number }) {
  const seconds = frame / fps;

  return (
    <AbsoluteFill style={{ mixBlendMode: "screen" }}>
      {TWINKLE_STARS.map((star, index) => {
        const wave = Math.sin(seconds * (0.9 + (index % 17) * 0.031) + star.phase);
        const blink = Math.pow(clamp01(0.55 + wave * 0.45), 2.1);
        const breathe = 0.74 + Math.sin(seconds * 0.21 + star.phase) * 0.26;
        const size = star.size * (0.82 + blink * 0.44);
        const x = star.x * width;
        const y = star.y * height;

        return (
          <div
            key={`spark-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              background: star.color,
              opacity: star.alpha * (0.28 + blink * 0.72) * breathe,
              boxShadow: `0 0 ${star.halo + blink * 7}px ${star.color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Meteor({ frame, fps, width, height }: { frame: number; fps: number; width: number; height: number }) {
  const start = 4.15 * fps;
  const duration = 1.18 * fps;
  const p = clamp01((frame - start) / duration);
  const active = frame >= start && frame <= start + duration;
  const eased = easeOut(p);
  const opacity = active ? Math.sin(p * Math.PI) : 0;
  const x = interpolate(eased, [0, 1], [width * 0.78, width * 0.28]);
  const y = interpolate(eased, [0, 1], [height * 0.08, height * 0.37]);
  const trail = interpolate(p, [0, 0.35, 1], [80, 320, 140]);
  const thickness = interpolate(p, [0, 0.28, 1], [1.5, 4.2, 2.2]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: trail,
        height: thickness,
        marginLeft: -trail * 0.08,
        marginTop: -thickness / 2,
        borderRadius: 999,
        opacity: opacity * 0.95,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0), rgba(173,210,255,0.35) 34%, rgba(255,255,255,0.96) 100%)",
        boxShadow: "0 0 22px rgba(178, 213, 255, 0.72), 0 0 48px rgba(124, 168, 255, 0.38)",
        transform: "rotate(-30deg)",
        transformOrigin: "88% 50%",
        mixBlendMode: "screen",
      }}
    />
  );
}

function CloudReveal({ frame, fps }: { frame: number; fps: number }) {
  const p = clamp01(frame / (2.4 * fps));
  const opacity = interpolate(p, [0, 0.5, 1], [0.82, 0.62, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(p, [0, 1], [0, -120]);
  const blur = interpolate(p, [0, 1], [42, 70]);

  return (
    <AbsoluteFill
      style={{
        opacity,
        background:
          "radial-gradient(ellipse at 28% 36%, rgba(228,236,255,0.9), transparent 42%), radial-gradient(ellipse at 58% 42%, rgba(200,214,255,0.7), transparent 44%), radial-gradient(ellipse at 74% 58%, rgba(157,181,242,0.58), transparent 46%), linear-gradient(180deg, rgba(190,205,246,0.44), rgba(25,43,92,0.12) 58%, transparent)",
        filter: `blur(${blur}px) saturate(1.1)`,
        transform: `translate3d(0, ${y}px, 0) scale(1.18)`,
        mixBlendMode: "screen",
      }}
    />
  );
}

function Grade() {
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 48% 30%, rgba(130,144,255,0.17), transparent 43%), radial-gradient(ellipse at 53% 85%, rgba(255,104,34,0.13), transparent 38%)",
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(2,5,18,0.08), transparent 38%, rgba(0,0,0,0.36) 100%), radial-gradient(ellipse at 50% 52%, transparent 0%, transparent 61%, rgba(0,0,0,0.48) 100%)",
        }}
      />
    </>
  );
}

export function LandingCampSky() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const bg = useMemo(() => staticFile(BACKGROUND), []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#020511", overflow: "hidden" }}>
      <Img src={bg} style={backgroundStyle(frame, fps)} />
      <TwinkleLayer frame={frame} fps={fps} width={width} height={height} />
      <Meteor frame={frame} fps={fps} width={width} height={height} />
      <CloudReveal frame={frame} fps={fps} />
      <Grade />
    </AbsoluteFill>
  );
}
