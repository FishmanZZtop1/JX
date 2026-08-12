import { useEffect, useRef } from "react";
import { flightRuntime } from "../flightStore";

const NEBULA_EXIT_START = 0.1;
const NEBULA_EXIT_END = 0.235;
const VIDEO_STAGE_END = 0.34;

const SOURCES = {
  idle: {
    src: "/scene-assets/nebula-idle-1080.mp4",
    poster: "/scene-assets/nebula-idle-poster.jpg",
    playbackRate: 0.88,
  },
  flight: {
    src: "/scene-assets/nebula-flight-1080.mp4",
    poster: "/scene-assets/nebula-flight-poster.jpg",
    playbackRate: 1,
  },
  reverse: {
    src: "/scene-assets/nebula-flight-reverse-1080.mp4",
    poster: "/scene-assets/nebula-flight-poster.jpg",
    playbackRate: 1,
  },
} as const;

type VideoMode = keyof typeof SOURCES;

const BUBBLE_SOURCE = "/scene-assets/nebula-bubble-overlay.mp4";

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

function seekVideoToProgress(video: HTMLVideoElement, mode: VideoMode, progress: number) {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return;
  const stage = clamp01(progress / VIDEO_STAGE_END);
  const target = mode === "reverse" ? 1 - stage : stage;
  try {
    video.currentTime = Math.min(video.duration - 0.05, Math.max(0.02, target * video.duration));
  } catch {
    // Browsers can reject seeks before metadata has settled; playback will recover on the next loop.
  }
}

export default function NebulaVideoLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const flightRef = useRef<HTMLVideoElement>(null);
  const reverseRef = useRef<HTMLVideoElement>(null);
  const bubbleRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videos: Record<VideoMode, HTMLVideoElement | null> = {
      idle: idleRef.current,
      flight: flightRef.current,
      reverse: reverseRef.current,
    };
    let activeMode: VideoMode = "idle";
    let lastProgress = flightRuntime.progress;
    let homeReplayArmed = true;
    let nativeLeftHome = nativeScrollProgress() > 0.085;
    let rafId = 0;
    let timeoutId = 0;

    const resetIdlePlayback = (video: HTMLVideoElement) => {
      try {
        video.currentTime = 0.02;
      } catch {
        // Metadata can arrive after the first frame; the next replay request will retry.
      }
    };

    const forceIdleReplay = () => {
      const idle = videos.idle;
      if (!idle) return;
      activeMode = "idle";
      resetIdlePlayback(idle);
      idle.style.opacity = "1";
      idle.playbackRate = flightRuntime.reducedMotion ? 0.35 : SOURCES.idle.playbackRate;
      const playPromise = idle.play();
      if (playPromise) playPromise.catch(() => undefined);
    };

    const activate = (mode: VideoMode, progress: number, visible: boolean, replayIdle = false) => {
      if (mode !== activeMode) {
        const next = videos[mode];
        if (next) {
          if (mode === "idle") {
            if (replayIdle) resetIdlePlayback(next);
          } else {
            seekVideoToProgress(next, mode, progress);
          }
        }
        activeMode = mode;
      }

      (Object.keys(videos) as VideoMode[]).forEach((key) => {
        const video = videos[key];
        if (!video) return;
        const shouldPlay = visible && key === activeMode;
        video.style.opacity = shouldPlay ? "1" : "0";
        video.playbackRate = flightRuntime.reducedMotion ? 0.35 : SOURCES[key].playbackRate;

        if (shouldPlay) {
          if (key === "idle") {
            if (replayIdle) resetIdlePlayback(video);
            if (video.ended && !replayIdle) return;
          }
          const playPromise = video.play();
          if (playPromise) playPromise.catch(() => undefined);
        } else if (!video.paused) {
          video.pause();
        }
      });
    };

    const scheduleTick = (active: boolean) => {
      if (active) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = 0;
        rafId = window.requestAnimationFrame(tick);
      }, 160);
    };

    const tick = (now: number) => {
      const layer = layerRef.current;
      const progress = flightRuntime.progress;
      const nativeProgress = nativeScrollProgress();
      const delta = progress - lastProgress;

      if (Math.abs(delta) > 0.00018) {
        activeMode = delta > 0 ? "flight" : "reverse";
      }

      if (progress > 0.085 || nativeProgress > 0.085) {
        homeReplayArmed = true;
        nativeLeftHome = true;
      }

      const atHome = nativeProgress < 0.018 || (nativeProgress < 0.06 && progress < 0.065);
      const forceNativeReplay = nativeLeftHome && nativeProgress < 0.018;
      if (forceNativeReplay) {
        nativeLeftHome = false;
        homeReplayArmed = false;
        forceIdleReplay();
      }

      const replayIdle = !forceNativeReplay && atHome && homeReplayArmed;
      if (replayIdle) {
        homeReplayArmed = false;
      }

      const nextMode: VideoMode = atHome ? "idle" : activeMode;
      const opacity = (1 - smoothstep(NEBULA_EXIT_START, NEBULA_EXIT_END, progress)) * (progress < 0.44 ? 1 : 0);
      const visible = opacity > 0.01;

      if (layer) {
        const reduced = flightRuntime.reducedMotion;
        const pulse = reduced ? 0 : Math.sin(now * 0.00044) * 0.5 + Math.sin(now * 0.00031 + 1.4) * 0.5;
        const breathing = reduced ? 0 : pulse * 0.006;
        const flightScale = 1.045 + smoothstep(0.03, VIDEO_STAGE_END, progress) * 0.22;
        const scale = nextMode === "idle" ? 1.038 + breathing : flightScale;
        const panX = flightRuntime.mouseX * (reduced ? 0.6 : 2.1);
        const panY = flightRuntime.mouseY * (reduced ? 0.4 : 1.45);
        const flowX = Math.sin(now * 0.00012 + 0.7) * 1.4 + flightRuntime.mouseX * 1.1;
        const flowY = Math.cos(now * 0.0001 + 1.2) * 1.0 - flightRuntime.mouseY * 0.8;
        const flowScale = 1.03 + Math.sin(now * 0.00018) * 0.025 + smoothstep(0.02, 0.18, progress) * 0.035;
        const flowRotate = Math.sin(now * 0.00009) * 2.4 + smoothstep(0.02, 0.2, progress) * 4.2;
        const flowOpacity = visible ? 0.38 + Math.max(0, pulse) * 0.12 : 0;
        const bubbleFade = visible ? 1 - smoothstep(0.18, 0.31, progress) : 0;
        const bubbleOpacity = bubbleFade * (reduced ? 0.42 : 0.86 + Math.max(0, pulse) * 0.12);
        const bubbleScale = 1.14 + (reduced ? 0 : Math.sin(now * 0.00021 + 0.7) * 0.024) + smoothstep(0.02, 0.18, progress) * 0.05;
        const bubbleX = -6.4 + Math.sin(now * 0.0001 + 2.1) * 0.85 + flightRuntime.mouseX * 0.7;
        const bubbleY = Math.cos(now * 0.00011 + 0.4) * 0.65 - flightRuntime.mouseY * 0.48;
        const bubbleRotate = Math.sin(now * 0.000075 + 1.2) * 2.2 + smoothstep(0.02, 0.19, progress) * 3.2;
        const rightFade = visible ? 1 - smoothstep(0.08, 0.28, progress) : 0;
        const rightOpacity = rightFade * (reduced ? 0.48 : 0.84 + Math.max(0, pulse) * 0.08);
        const rightStarOpacity = rightFade * (reduced ? 0.42 : 0.96 + Math.max(0, pulse) * 0.08);
        layer.style.opacity = opacity.toFixed(4);
        layer.style.visibility = visible ? "visible" : "hidden";
        layer.style.transform = `translate3d(${panX.toFixed(3)}vw, ${(-panY).toFixed(3)}vh, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        layer.style.setProperty("--nebula-flow-x", `${flowX.toFixed(3)}vw`);
        layer.style.setProperty("--nebula-flow-y", `${flowY.toFixed(3)}vh`);
        layer.style.setProperty("--nebula-flow-scale", flowScale.toFixed(4));
        layer.style.setProperty("--nebula-flow-rotate", `${flowRotate.toFixed(3)}deg`);
        layer.style.setProperty("--nebula-flow-opacity", flowOpacity.toFixed(4));
        layer.style.setProperty("--nebula-bubble-x", `${bubbleX.toFixed(3)}vw`);
        layer.style.setProperty("--nebula-bubble-y", `${bubbleY.toFixed(3)}vh`);
        layer.style.setProperty("--nebula-bubble-scale", bubbleScale.toFixed(4));
        layer.style.setProperty("--nebula-bubble-rotate", `${bubbleRotate.toFixed(3)}deg`);
        layer.style.setProperty("--nebula-bubble-opacity", bubbleOpacity.toFixed(4));
        layer.style.setProperty("--nebula-right-opacity", rightOpacity.toFixed(4));
        layer.style.setProperty("--nebula-right-star-opacity", rightStarOpacity.toFixed(4));
      }

      const bubble = bubbleRef.current;
      if (bubble) {
        const shouldPlayBubble = visible && progress < 0.34 && !flightRuntime.reducedMotion;
        bubble.playbackRate = 0.72;
        if (shouldPlayBubble) {
          const playPromise = bubble.play();
          if (playPromise) playPromise.catch(() => undefined);
        } else if (!bubble.paused) {
          bubble.pause();
        }
      }

      activate(nextMode, progress, visible, replayIdle);
      lastProgress = progress;
      scheduleTick(visible || progress < 0.28 || nativeProgress < 0.16);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId) window.clearTimeout(timeoutId);
      (Object.keys(videos) as VideoMode[]).forEach((key) => videos[key]?.pause());
      bubbleRef.current?.pause();
    };
  }, []);

  return (
    <div ref={layerRef} className="nebulaVideoLayer" aria-hidden="true">
      {(Object.keys(SOURCES) as VideoMode[]).map((mode) => (
        <video
          key={mode}
          ref={mode === "idle" ? idleRef : mode === "flight" ? flightRef : reverseRef}
          className="nebulaVideo"
          src={SOURCES[mode].src}
          poster={SOURCES[mode].poster}
          preload={mode === "idle" ? "auto" : "metadata"}
          muted
          loop={mode !== "idle"}
          playsInline
        />
      ))}
      <video
        ref={bubbleRef}
        className="nebulaBubbleVideo"
        src={BUBBLE_SOURCE}
        preload="metadata"
        muted
        loop
        playsInline
      />
      <span className="nebulaRightUnifier" />
      <span className="nebulaRightStarVeil" />
      <span className="nebulaFlow nebulaFlowPrimary" />
      <span className="nebulaFlow nebulaFlowSecondary" />
      <span className="nebulaFlow nebulaDustFlow" />
    </div>
  );
}
