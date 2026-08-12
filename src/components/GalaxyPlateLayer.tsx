import { useEffect, useRef } from "react";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";

const GALAXY_PLATE_SRC = "/scene-assets/galaxy-plate-final.png";
const GALAXY_IN_START = 0.045;
const GALAXY_IN_END = 0.115;
const GALAXY_OUT_START = 0.25;
const GALAXY_OUT_END = 0.34;
const GALAXY_PRELOAD_START = 0.004;

type GalaxyStar = {
  x: number;
  y: number;
  depth: number;
  size: number;
  alpha: number;
  phase: number;
  frequency: number;
  stretch: number;
  drift: number;
  color: [number, number, number];
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function stableCanvasDpr(width: number, height: number) {
  const raw = window.devicePixelRatio || 1;
  const pixelBudget = width * height > 2_600_000 ? 2_200_000 : 3_200_000;
  const cap = Math.sqrt(pixelBudget / Math.max(1, width * height));
  return Math.max(0.82, Math.min(1.2, raw, cap));
}

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

function createGalaxyStars(count: number) {
  const rand = seeded(870421);
  const stars: GalaxyStar[] = [];

  for (let index = 0; index < count; index += 1) {
    const mode = rand();
    let x = rand();
    let y = rand();

    if (mode < 0.46) {
      x = 0.24 + rand() * 0.74;
      y = 0.5 - (x - 0.55) * 0.32 + gaussian(rand) * 0.075;
    } else if (mode < 0.72) {
      x = 0.04 + rand() * 0.92;
      y = 0.08 + Math.pow(rand(), 1.25) * 0.78;
    }

    const warm = rand() > 0.72;
    const blue = !warm && rand() > 0.52;
    const bright = rand() > 0.956;
    const color: [number, number, number] = warm
      ? [255, 224 + rand() * 22, 188 + rand() * 36]
      : blue
        ? [176 + rand() * 38, 210 + rand() * 34, 255]
        : [224 + rand() * 28, 235 + rand() * 18, 255];

    stars.push({
      x,
      y,
      depth: 0.35 + rand() * 1.4,
      size: bright ? 0.92 + rand() * 1.45 : 0.26 + rand() * 0.78,
      alpha: bright ? 0.82 + rand() * 0.18 : 0.24 + rand() * 0.56,
      phase: rand() * Math.PI * 2,
      frequency: 0.55 + rand() * 1.65,
      stretch: bright ? 1.8 + rand() * 4.2 : rand() > 0.952 ? 0.9 + rand() * 2.1 : 0,
      drift: (rand() - 0.5) * (bright ? 0.9 : 0.42),
      color,
    });
  }

  return stars;
}

export default function GalaxyPlateLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<GalaxyStar[]>([]);

  useEffect(() => {
    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let largeViewport = false;
    let lastLayerOpacity = "";
    let lastLayerVisibility = "";
    let lastLayerTransform = "";
    let lastFlowOpacity = "";
    let lastStarOpacity = "";

    const ensurePlateSource = (progress: number) => {
      const image = imageRef.current;
      if (!image || image.dataset.loaded === "true" || progress < GALAXY_PRELOAD_START) return;
      image.dataset.loaded = "true";
      image.setAttribute("fetchpriority", "high");
      image.src = GALAXY_PLATE_SRC;
    };

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      largeViewport = width * height > 2_600_000;
      dpr = stableCanvasDpr(width, height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const low = width < 760 || window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
      starsRef.current = createGalaxyStars(low ? 390 : largeViewport ? 720 : 920);
    };

    const drawStars = (now: number, opacity: number, local: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: true });
      if (!canvas || !ctx || opacity <= 0.004) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const centerX = width * 0.58;
      const centerY = height * 0.48;
      const angle = -0.46 + local * 0.22;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const mouseX = flightRuntime.mouseX * 24;
      const mouseY = flightRuntime.mouseY * 18;

      for (const star of starsRef.current) {
        const zoom = 1 + local * 0.24 * star.depth;
        const drift = Math.sin(now * 0.0002 * star.frequency + star.phase) * star.drift;
        const baseX = centerX + (star.x * width - centerX) * zoom + mouseX * star.depth + drift * 38;
        const baseY = centerY + (star.y * height - centerY) * zoom - mouseY * star.depth - drift * 22;
        if (baseX < -12 || baseX > width + 12 || baseY < -12 || baseY > height + 12) continue;

        const twinkle =
          0.62 +
          Math.sin(now * 0.00108 * star.frequency + star.phase) * 0.34 +
          Math.sin(now * 0.00031 + star.phase * 1.7) * 0.2;
        const alpha = opacity * star.alpha * Math.max(0.12, twinkle);
        const size = star.size * 1.2 * (0.92 + local * 0.24) * star.depth;
        const [r, g, b] = star.color;

        if (star.stretch > 0.1) {
          const length = star.stretch * (1 + local * 2.1);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.28})`;
          ctx.lineWidth = Math.max(0.35, size * 0.22);
          ctx.beginPath();
          ctx.moveTo(baseX - cos * length, baseY - sin * length);
          ctx.lineTo(baseX + cos * length, baseY + sin * length);
          ctx.stroke();
        }

        if (size < 1.05) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillRect(Math.round(baseX), Math.round(baseY), 1, 1);
        } else {
          const glowRadius = size * 1.75;
          const glow = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, glowRadius);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          glow.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.24})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(baseX, baseY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.82})`;
          ctx.fillRect(Math.round(baseX), Math.round(baseY), 1, 1);

          if (size > 1.45 && alpha > 0.04) {
            const ray = size * (2.8 + Math.max(0, twinkle) * 1.7);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.24})`;
            ctx.lineWidth = Math.max(0.42, size * 0.1);
            ctx.beginPath();
            ctx.moveTo(baseX - ray, baseY);
            ctx.lineTo(baseX + ray, baseY);
            ctx.moveTo(baseX, baseY - ray * 0.58);
            ctx.lineTo(baseX, baseY + ray * 0.58);
            ctx.stroke();
          }
        }
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const scheduleTick = (active: boolean) => {
      rafId = active ? window.requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      resize();
      wake();
    };

    const tick = (now: number) => {
      rafId = 0;
      const progress = flightRuntime.progress;
      ensurePlateSource(progress);
      const fadeIn = smoothstep(GALAXY_IN_START, GALAXY_IN_END, progress);
      const fadeOut = 1 - smoothstep(GALAXY_OUT_START, GALAXY_OUT_END, progress);
      const opacity = fadeIn * fadeOut;
      const layer = layerRef.current;

      if (layer) {
        const local = smoothstep(GALAXY_IN_START, GALAXY_OUT_START, progress);
        const parallaxX = flightRuntime.mouseX * (flightRuntime.reducedMotion ? 0.22 : 1.12);
        const parallaxY = flightRuntime.mouseY * (flightRuntime.reducedMotion ? 0.18 : 0.82);
        const styleNow = largeViewport ? Math.round(now / 50) * 50 : now;
        const breathing = Math.sin(styleNow * 0.00024) * (largeViewport ? 0.024 : 0.035);
        const rotation =
          -8.5 +
          local * 15.5 +
          Math.sin(styleNow * 0.0002) * (largeViewport ? 0.56 : 0.86) +
          flightRuntime.mouseX * (flightRuntime.reducedMotion ? 0.12 : 0.72);
        const scale = 1.02 + local * 0.42 + breathing;
        const nextOpacity = opacity.toFixed(4);
        const nextVisibility = opacity > 0.008 ? "visible" : "hidden";
        const nextTransform = `translate3d(${parallaxX.toFixed(3)}vw, ${(-parallaxY).toFixed(3)}vh, 0) rotate(${rotation.toFixed(3)}deg) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        const nextFlowOpacity = (opacity * (flightRuntime.reducedMotion ? 0.32 : 0.58)).toFixed(4);
        const nextStarOpacity = (opacity * 0.86).toFixed(4);
        if (nextOpacity !== lastLayerOpacity) {
          layer.style.opacity = nextOpacity;
          lastLayerOpacity = nextOpacity;
        }
        if (nextVisibility !== lastLayerVisibility) {
          layer.style.visibility = nextVisibility;
          lastLayerVisibility = nextVisibility;
        }
        if (nextTransform !== lastLayerTransform) {
          layer.style.transform = nextTransform;
          lastLayerTransform = nextTransform;
        }
        if (nextFlowOpacity !== lastFlowOpacity) {
          layer.style.setProperty("--galaxy-plate-flow-opacity", nextFlowOpacity);
          lastFlowOpacity = nextFlowOpacity;
        }
        if (nextStarOpacity !== lastStarOpacity) {
          layer.style.setProperty("--galaxy-plate-star-opacity", nextStarOpacity);
          lastStarOpacity = nextStarOpacity;
        }
      }

      drawStars(now, opacity, smoothstep(GALAXY_IN_START, GALAXY_OUT_START, progress));
      scheduleTick(opacity > 0.006 || (progress > GALAXY_IN_START - 0.05 && progress < GALAXY_OUT_END + 0.06));
    };

    resize();
    window.addEventListener("resize", handleResize, { passive: true });
    const unsubscribe = subscribeFlightRuntime(wake);
    wake();
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={layerRef} className="galaxyPlateLayer" aria-hidden="true">
      <img ref={imageRef} className="galaxyPlateImage" alt="" decoding="async" draggable={false} />
      <span className="galaxyPlateFlow" />
      <canvas ref={canvasRef} className="galaxyPlateStars" />
      <span className="galaxyPlateVignette" />
    </div>
  );
}
