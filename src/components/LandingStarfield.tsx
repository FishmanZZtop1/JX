import { useEffect, useRef } from "react";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";

const LANDING_STARS_START = 0.852;
const LANDING_STARS_FULL = 0.918;

type LandingStar = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
  glow: number;
  band: boolean;
  color: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function centeredNoise(rand: () => number) {
  return (rand() + rand() + rand() - 1.5) / 1.5;
}

function createStars(count: number, portrait: boolean) {
  const rand = seeded(portrait ? 10082026 : 10082027);
  const colors = ["#ffffff", "#f4f7ff", "#dce8ff", "#d9d0ff"];

  return Array.from({ length: count }, () => {
    const band = rand() < 0.72;
    let x = rand();
    let y = rand() * (portrait ? 0.435 : 0.49);

    if (band) {
      x = Math.pow(rand(), 1.08) * (portrait ? 0.68 : 0.64);
      const centerY = 0.014 + x * (portrait ? 0.67 : 0.62);
      const spread = 0.025 + Math.sin(clamp01(x / 0.64) * Math.PI) * 0.055;
      y = centerY + centeredNoise(rand) * spread;
    }

    const bright = rand() > 0.88;

    return {
      x: clamp01(x),
      y: Math.max(0.008, Math.min(portrait ? 0.455 : 0.515, y)),
      size: bright ? 0.96 + rand() * 0.24 : 0.55 + rand() * 0.38,
      alpha: bright ? 0.82 + rand() * 0.18 : 0.42 + rand() * 0.34,
      phase: rand() * Math.PI * 2,
      speed: 0.72 + rand() * 0.82,
      glow: bright ? 2.4 : rand() > 0.64 ? 1.45 : 0,
      band,
      color: band && rand() < 0.72 ? "#ffffff" : colors[Math.floor(rand() * colors.length)],
    } satisfies LandingStar;
  });
}

export default function LandingStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let rafId = 0;
    let lastDrawAt = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let portrait = false;
    let stars: LandingStar[] = [];
    let starGroups: LandingStar[][] = [[], [], []];
    let context: CanvasRenderingContext2D | null = null;

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      portrait = width / height < 0.78;
      context = canvas.getContext("2d", { alpha: true });
      const pixelCap = Math.sqrt(2_000_000 / Math.max(1, width * height));
      dpr = Math.max(0.82, Math.min(window.devicePixelRatio || 1, 1.25, pixelCap));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      stars = createStars(portrait ? 680 : 920, portrait);
      starGroups = [[], [], []];
      for (const star of stars) {
        const group = star.glow >= 2 ? 2 : star.glow >= 1 ? 1 : 0;
        starGroups[group].push(star);
      }
    };

    const clear = () => {
      const canvas = canvasRef.current;
      if (!canvas || !context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    const shouldAnimate = () =>
      !document.hidden && !flightRuntime.reducedMotion && flightRuntime.progress >= LANDING_STARS_START;

    const drawStarGroup = (group: LandingStar[], glow: number, seconds: number, reveal: number) => {
      if (!context) return;
      context.shadowBlur = glow;

      for (const star of group) {
        const wave = Math.sin(seconds * star.speed + star.phase) * 0.5 + 0.5;
        const twinkle = wave * wave * (3 - 2 * wave);
        const sweep = star.band
          ? Math.max(0, Math.cos(seconds * 0.5 - star.x * Math.PI * 2.25)) ** 5
          : 0;
        const intensity = Math.min(1.18, 0.28 + twinkle * 0.8 + sweep * 0.42);
        const alpha = reveal * star.alpha * intensity;
        const x = star.x * width;
        const y = star.y * height;

        context.globalAlpha = alpha;
        context.fillStyle = star.color;
        context.shadowColor = star.color;
        context.fillRect(x - star.size * 0.5, y - star.size * 0.5, star.size, star.size);
      }
    };

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !context) return;

      const reveal = smoothstep(LANDING_STARS_START, LANDING_STARS_FULL, flightRuntime.progress);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (reveal <= 0.002) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.globalCompositeOperation = "lighter";
      const seconds = now * 0.001;

      drawStarGroup(starGroups[0], 0, seconds, reveal);
      drawStarGroup(starGroups[1], 1.45, seconds, reveal);
      drawStarGroup(starGroups[2], 2.4, seconds, reveal);

      context.shadowBlur = 0;
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      rafId = 0;
      const frameInterval = flightRuntime.lowPerformance ? 1000 / 24 : 1000 / 30;
      if (now - lastDrawAt >= frameInterval - 1) {
        lastDrawAt = now;
        draw(now);
      }
      if (shouldAnimate()) rafId = window.requestAnimationFrame(frame);
    };

    const wake = () => {
      if (flightRuntime.progress < LANDING_STARS_START) {
        clear();
        return;
      }
      if (rafId === 0) rafId = window.requestAnimationFrame(frame);
    };

    const handleResize = () => {
      resize();
      wake();
    };

    resize();
    const unsubscribe = subscribeFlightRuntime(wake);
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", wake);
    wake();

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return <canvas ref={canvasRef} className="landingTwinkleStars" aria-hidden="true" />;
}
