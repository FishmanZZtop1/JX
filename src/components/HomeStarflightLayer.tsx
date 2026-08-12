import { useEffect, useMemo, useRef } from "react";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";

const HOME_EXIT_START = 0.05;
const HOME_EXIT_END = 0.13;
const VIDEO_STAGE_END = 0.31;
const HOME_PLAY_SECONDS = 3;
const AUTO_ADVANCE_PROGRESS = 0.13;
const SCROLL_VIDEO_DESKTOP_SRC = "/scene-assets/home-nebula-scroll-4k.mp4";
const SCROLL_VIDEO_MOBILE_SRC = "/scene-assets/home-nebula-scroll-1080.mp4";
const POSTER_SRC = "/scene-assets/home-nebula-bg.png";

type HomeStar = {
  x: number;
  y: number;
  depth: number;
  size: number;
  alpha: number;
  phase: number;
  frequency: number;
  streak: number;
  cross: number;
  color: [number, number, number];
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function nativeScrollProgress() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return clamp01(window.scrollY / maxScroll);
}

function selectScrollVideoSource() {
  if (typeof window === "undefined") return SCROLL_VIDEO_DESKTOP_SRC;

  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  const constrainedNetwork =
    connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g";
  const renderedWidth = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);

  if (window.matchMedia("(max-width: 760px)").matches || constrainedNetwork || renderedWidth < 2400) {
    return SCROLL_VIDEO_MOBILE_SRC;
  }

  return SCROLL_VIDEO_DESKTOP_SRC;
}

function setVideoPlaybackRate(video: HTMLVideoElement) {
  if (video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) return;
  video.playbackRate = Math.min(2.4, Math.max(0.65, video.duration / HOME_PLAY_SECONDS));
}

function stableCanvasDpr(width: number, height: number) {
  const raw = window.devicePixelRatio || 1;
  const pixelBudget = width * height > 2_600_000 ? 4_200_000 : 3_600_000;
  const cap = Math.sqrt(pixelBudget / Math.max(1, width * height));
  return Math.max(0.9, Math.min(1.12, raw, cap));
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function createHomeStars(count: number) {
  const rand = seeded(429771);
  const stars: HomeStar[] = [];

  for (let index = 0; index < count; index += 1) {
    const bright = rand() > 0.79;
    const hero = bright && rand() > 0.55;
    const palette = rand();
    const color: [number, number, number] =
      palette > 0.66
        ? [186 + rand() * 44, 112 + rand() * 58, 255]
        : palette > 0.38
          ? [255, 156 + rand() * 54, 234 + rand() * 20]
          : palette > 0.16
            ? [142 + rand() * 52, 204 + rand() * 44, 255]
            : [228 + rand() * 27, 222 + rand() * 30, 255];

    stars.push({
      x: rand(),
      y: rand(),
      depth: 0.35 + rand() * 1.5,
      size: hero ? 2.05 + rand() * 2.35 : bright ? 0.86 + rand() * 1.38 : 0.25 + rand() * 0.72,
      alpha: hero ? 0.86 + rand() * 0.14 : bright ? 0.62 + rand() * 0.3 : 0.24 + rand() * 0.5,
      phase: rand() * Math.PI * 2,
      frequency: 0.7 + rand() * 2.35,
      streak: hero && rand() > 0.56 ? 0.42 + rand() * 1.2 : rand() > 0.99 ? 0.3 + rand() * 0.8 : 0,
      cross: hero ? 0.48 + rand() * 0.82 : bright && rand() > 0.82 ? 0.22 + rand() * 0.46 : 0,
      color,
    });
  }

  return stars;
}

export default function HomeStarflightLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<HomeStar[]>([]);
  const scrollVideoSrc = useMemo(selectScrollVideoSource, []);

  useEffect(() => {
    const video = videoRef.current;
    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let hasTriggeredPlayback = false;
    let playbackRateReady = false;
    let lastVideoOpacity = "";
    let lastPosterOpacity = "";
    let lastLayerOpacity = "";
    let lastLayerVisibility = "";
    let lastLayerTransform = "";
    let lastVignette = "";
    let autoAdvanced = false;

    const resizeStars = () => {
      const canvas = starsCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = stableCanvasDpr(width, height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const low = width < 760 || window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
      const large = width * height > 2_600_000;
      starsRef.current = createHomeStars(low ? 430 : large ? 900 : 1260);
    };

    const drawHomeStars = (now: number, opacity: number, videoStage: number) => {
      const canvas = starsCanvasRef.current;
      const ctx = canvas?.getContext("2d", { alpha: true });
      if (!canvas || !ctx || opacity <= 0.004) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const globalOpacity = opacity * (1.06 - videoStage * 0.14);
      const mouseX = flightRuntime.mouseX * 8;
      const mouseY = flightRuntime.mouseY * 6;
      const driftX = Math.sin(now * 0.00006) * 3.4;
      const driftY = Math.cos(now * 0.000055) * 2.6;

      for (const star of starsRef.current) {
        const x = star.x * width + mouseX * star.depth + driftX * star.depth;
        const y = star.y * height - mouseY * star.depth + driftY * star.depth;
        const shimmer = 0.5 + Math.sin(now * 0.00155 * star.frequency + star.phase) * 0.5;
        const slowPulse = 0.5 + Math.sin(now * 0.0005 + star.phase * 1.7) * 0.5;
        const flare = star.cross > 0.1 ? smoothstep(0.78, 0.96, shimmer) * 0.34 : 0;
        const twinkle = 0.2 + shimmer * 0.58 + slowPulse * 0.18 + flare;
        const alpha = globalOpacity * star.alpha * Math.min(1.16, Math.max(0.1, twinkle));
        const [r, g, b] = star.color;

        if (star.streak > 0.1) {
          const length = star.streak * (11 + Math.sin(now * 0.00028 + star.phase) * 4);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.36})`;
          ctx.lineWidth = Math.max(0.35, star.size * 0.22);
          ctx.beginPath();
          ctx.moveTo(x - length * 0.45, y + length * 0.75);
          ctx.lineTo(x + length * 0.45, y - length * 0.75);
          ctx.stroke();
        }

        if (star.size < 1.05) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        } else {
          const radius = star.size * (1.45 + Math.max(0, twinkle) * 0.34);
          const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          glow.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${alpha * 0.32})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.76})`;
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }

        if (star.cross > 0.1 && alpha > 0.06) {
          const ray = star.cross * (4.8 + Math.max(0, twinkle) * 2.6);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.58})`;
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x - ray, y);
          ctx.lineTo(x + ray, y);
          ctx.moveTo(x, y - ray * 0.72);
          ctx.lineTo(x, y + ray * 0.72);
          ctx.stroke();
        }
      }

      // A single uninterrupted trajectory prevents the home meteor from reading as a pendulum.
      const meteorCycle = (now * 0.000055 + 0.18) % 1;
      const meteorTravel = smoothstep(0.03, 0.19, meteorCycle);
      const meteorOpacity = smoothstep(0.03, 0.065, meteorCycle) * (1 - smoothstep(0.23, 0.32, meteorCycle));
      if (meteorOpacity > 0.001) {
        const headX = width * (1.08 - meteorTravel * 1.26);
        const headY = height * (0.07 + meteorTravel * 0.74);
        const tailX = Math.min(width, height) * 0.23;
        const tailY = -Math.min(width, height) * 0.135;
        const gradient = ctx.createLinearGradient(headX + tailX, headY + tailY, headX, headY);
        gradient.addColorStop(0, "rgba(188, 204, 255, 0)");
        gradient.addColorStop(0.58, `rgba(214, 198, 255, ${meteorOpacity * globalOpacity * 0.24})`);
        gradient.addColorStop(1, `rgba(255, 237, 255, ${meteorOpacity * globalOpacity * 0.72})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(0.85, Math.min(width, height) * 0.00115);
        ctx.beginPath();
        ctx.moveTo(headX + tailX, headY + tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const autoAdvanceToGalaxy = () => {
      if (autoAdvanced || nativeScrollProgress() >= AUTO_ADVANCE_PROGRESS * 0.88) return;
      autoAdvanced = true;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({
        top: maxScroll * AUTO_ADVANCE_PROGRESS,
        behavior: flightRuntime.reducedMotion ? "auto" : "smooth",
      });
    };

    const handleLoadedMetadata = () => {
      if (!video) return;
      setVideoPlaybackRate(video);
      playbackRateReady = true;
    };

    video?.load();
    video?.addEventListener("loadedmetadata", handleLoadedMetadata);
    video?.addEventListener("ended", autoAdvanceToGalaxy);
    resizeStars();
    window.addEventListener("resize", resizeStars, { passive: true });

    const scheduleTick = (active: boolean) => {
      rafId = active ? window.requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      rafId = 0;
      const progress = flightRuntime.progress;
      const nativeProgress = nativeScrollProgress();
      const activationProgress = Math.max(progress, nativeProgress);
      const atOpeningFrame = nativeProgress < 0.0015 && progress < 0.004;
      const opacity = (1 - smoothstep(HOME_EXIT_START, HOME_EXIT_END, activationProgress)) * (activationProgress < HOME_EXIT_END + 0.035 ? 1 : 0);
      const videoStage = smoothstep(0.0015, 0.035, activationProgress);
      const showVideo = !atOpeningFrame && opacity > 0.01;
      const layer = layerRef.current;
      const poster = posterRef.current;

      if (layer) {
        const reduced = flightRuntime.reducedMotion;
        const stage = smoothstep(0.004, VIDEO_STAGE_END, activationProgress);
        const parallaxX = flightRuntime.mouseX * (reduced ? 0.16 : 0.36);
        const parallaxY = flightRuntime.mouseY * (reduced ? 0.12 : 0.26);
        const scale = 1.006 + stage * 0.024;
        const nextOpacity = opacity.toFixed(4);
        const nextVisibility = opacity > 0.01 ? "visible" : "hidden";
        const nextTransform = `translate3d(${parallaxX.toFixed(3)}vw, ${(-parallaxY).toFixed(3)}vh, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        const nextVignette = (0.52 - stage * 0.13).toFixed(4);
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
        if (nextVignette !== lastVignette) {
          layer.style.setProperty("--home-starflight-vignette", nextVignette);
          lastVignette = nextVignette;
        }
      }

      if (poster) {
        const posterOpacity = (1 - videoStage * 0.82).toFixed(4);
        if (posterOpacity !== lastPosterOpacity) {
          poster.style.opacity = posterOpacity;
          lastPosterOpacity = posterOpacity;
        }
      }

      if (video) {
        const videoOpacity = showVideo ? videoStage.toFixed(4) : "0";
        if (videoOpacity !== lastVideoOpacity) {
          video.style.opacity = videoOpacity;
          lastVideoOpacity = videoOpacity;
        }

        if (showVideo) {
          if (!playbackRateReady) {
            setVideoPlaybackRate(video);
            playbackRateReady = video.readyState >= 1;
          }
          if (!hasTriggeredPlayback && video.readyState >= 1) {
            try {
              video.currentTime = 0.02;
            } catch {
              // Metadata can arrive late; the next frame will try to play normally.
            }
            hasTriggeredPlayback = true;
          }
          if (!video.ended && video.paused) {
            const playPromise = video.play();
            if (playPromise) playPromise.catch(() => undefined);
          } else if (video.ended) {
            autoAdvanceToGalaxy();
          }
        } else {
          if (!video.paused) video.pause();
          if (atOpeningFrame) {
            hasTriggeredPlayback = false;
            autoAdvanced = false;
            if (video.readyState >= 1) {
              try {
                video.currentTime = 0;
              } catch {
                // Ignore early metadata timing.
              }
            }
          }
        }
      }

      drawHomeStars(now, opacity, videoStage);
      scheduleTick(opacity > 0.006 || activationProgress < 0.16 || (video ? !video.paused : false));
    };

    const unsubscribe = subscribeFlightRuntime(wake);
    wake();
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      unsubscribe();
      window.removeEventListener("resize", resizeStars);
      video?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video?.removeEventListener("ended", autoAdvanceToGalaxy);
      video?.pause();
    };
  }, []);

  return (
    <div ref={layerRef} className="homeStarflightLayer" aria-hidden="true">
      <img ref={posterRef} className="homeStarflightPoster" src={POSTER_SRC} alt="" draggable={false} />
      <video
        ref={videoRef}
        className="homeStarflightVideo"
        src={scrollVideoSrc}
        poster={POSTER_SRC}
        preload="metadata"
        muted
        playsInline
      />
      <canvas ref={starsCanvasRef} className="homeStarflightStars" />
      <span className="homeStarflightVignette" />
    </div>
  );
}
