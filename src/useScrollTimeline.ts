import { useEffect } from "react";
import { setRuntimeMouse, setRuntimePerformanceFlags, setRuntimeProgress } from "./flightStore";
import { sceneIndexForProgress } from "./sceneData";

type UseScrollTimelineOptions = {
  onSceneChange: (index: number) => void;
};

const LANDING_AUTOPLAY_START = 0.805;
const LANDING_AUTOPLAY_RESET = 0.72;
const LANDING_AUTOPLAY_DURATION = 2800;
const LANDING_MOUSE_CUTOFF = 0.805;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function lowPerformanceDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || mobile || coarsePointer;
}

function scrollProgress() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return clamp01(window.scrollY / maxScroll);
}

export function useScrollTimeline({ onSceneChange }: UseScrollTimelineOptions) {
  useEffect(() => {
    let activeScene = -1;
    let rafId = 0;
    let targetProgress = scrollProgress();
    let smoothProgress = targetProgress;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;
    let lastFrameTime = performance.now();
    let lastObservedScrollY = window.scrollY;
    let lastNativeProgress = targetProgress;
    let autoLandingTriggered = false;
    let autoLandingRaf = 0;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyPerformanceFlags = () => {
      setRuntimePerformanceFlags({
        lowPerformance: lowPerformanceDevice(),
        reducedMotion: reducedMotionQuery.matches,
      });
    };

    const commit = () => {
      setRuntimeProgress(smoothProgress);
      setRuntimeMouse(
        smoothProgress >= LANDING_MOUSE_CUTOFF ? 0 : smoothMouseX,
        smoothProgress >= LANDING_MOUSE_CUTOFF ? 0 : smoothMouseY,
      );
      document.documentElement.style.setProperty("--flight-progress", smoothProgress.toFixed(4));

      const nextScene = sceneIndexForProgress(smoothProgress);
      if (nextScene !== activeScene) {
        activeScene = nextScene;
        onSceneChange(nextScene);
      }
    };

    function tick(time: number) {
      targetProgress = scrollProgress();
      const delta = Math.min(0.08, Math.max(0.001, (time - lastFrameTime) / 1000));
      lastFrameTime = time;
      const progressGap = Math.abs(targetProgress - smoothProgress);
      const baseProgressEase = reducedMotionQuery.matches ? 0.24 : Math.min(0.12, Math.max(0.045, delta * 4.1));
      const progressEase =
        progressGap > 0.18 ? Math.max(baseProgressEase, 0.18) : progressGap > 0.08 ? Math.max(baseProgressEase, 0.14) : baseProgressEase;
      const mouseEase = reducedMotionQuery.matches ? 0.22 : Math.min(0.075, Math.max(0.025, delta * 2.65));

      smoothProgress += (targetProgress - smoothProgress) * progressEase;
      smoothMouseX += (targetMouseX - smoothMouseX) * mouseEase;
      smoothMouseY += (targetMouseY - smoothMouseY) * mouseEase;

      if (Math.abs(targetProgress - smoothProgress) < 0.00008) {
        smoothProgress = targetProgress;
      }
      if (Math.abs(targetMouseX - smoothMouseX) < 0.0005) {
        smoothMouseX = targetMouseX;
      }
      if (Math.abs(targetMouseY - smoothMouseY) < 0.0005) {
        smoothMouseY = targetMouseY;
      }

      commit();

      const stillSettling =
        Math.abs(targetProgress - smoothProgress) > 0.00008 ||
        Math.abs(targetMouseX - smoothMouseX) > 0.0005 ||
        Math.abs(targetMouseY - smoothMouseY) > 0.0005;

      if (stillSettling) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      rafId = 0;
    }

    function wake() {
      if (rafId === 0) {
        lastFrameTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    }

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function startLandingAutoplay() {
      if (autoLandingTriggered || autoLandingRaf !== 0 || reducedMotionQuery.matches) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const startY = window.scrollY;
      const endY = maxScroll;
      const distance = endY - startY;
      if (distance < window.innerHeight * 0.12) {
        autoLandingTriggered = true;
        return;
      }

      autoLandingTriggered = true;
      const startedAt = performance.now();
      const step = (now: number) => {
        const t = clamp01((now - startedAt) / LANDING_AUTOPLAY_DURATION);
        const nextY = startY + distance * easeInOutCubic(t);
        window.scrollTo(0, nextY);
        syncTargetProgress();
        wake();
        if (t < 1) {
          autoLandingRaf = window.requestAnimationFrame(step);
          return;
        }
        autoLandingRaf = 0;
      };
      autoLandingRaf = window.requestAnimationFrame(step);
    }

    const syncTargetProgress = () => {
      lastObservedScrollY = window.scrollY;
      targetProgress = scrollProgress();
      if (targetProgress >= LANDING_MOUSE_CUTOFF) {
        targetMouseX = 0;
        targetMouseY = 0;
      }
    };

    const onScroll = () => {
      syncTargetProgress();
      const movingDown = targetProgress > lastNativeProgress + 0.0015;
      if (targetProgress < LANDING_AUTOPLAY_RESET) {
        autoLandingTriggered = false;
      }
      if (movingDown && targetProgress >= LANDING_AUTOPLAY_START) {
        startLandingAutoplay();
      }
      lastNativeProgress = targetProgress;
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (targetProgress >= LANDING_MOUSE_CUTOFF) return;
      targetMouseX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetMouseY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * -2;
      wake();
    };

    const onResize = () => {
      applyPerformanceFlags();
      syncTargetProgress();
      wake();
    };

    const onReducedMotionChange = () => {
      applyPerformanceFlags();
      wake();
    };

    document.documentElement.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
    applyPerformanceFlags();
    commit();
    wake();

    const scrollWatchId = window.setInterval(() => {
      if (window.scrollY !== lastObservedScrollY) {
        syncTargetProgress();
        wake();
      }
    }, 250);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      window.clearInterval(scrollWatchId);
      if (autoLandingRaf !== 0) {
        window.cancelAnimationFrame(autoLandingRaf);
      }
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [onSceneChange]);
}
