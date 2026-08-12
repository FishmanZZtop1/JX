import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import GalaxyPlateLayer from "./components/GalaxyPlateLayer";
import HomeStarflightLayer from "./components/HomeStarflightLayer";
import LandingSequenceLayer from "./components/LandingSequenceLayer";
import EarthLocator from "./components/EarthLocator";
import OverlayContent from "./components/OverlayContent";
import { FLIGHT_SCENES } from "./sceneData";
import { useScrollTimeline } from "./useScrollTimeline";

const loadSceneCanvas = () => import("./components/SceneCanvas");
const SceneCanvas = lazy(loadSceneCanvas);

const INTERACTIVE_TARGETS =
  'a, button, input, select, textarea, label, [role="button"], [role="dialog"], [data-no-scene-advance]';
const NEBULA_CLICK_FLIGHT_DURATION = 3000;
const NEBULA_CLICK_CRUISE_PROGRESS = 0.052;
const NEBULA_CLICK_EXIT_PROGRESS = 0.13;

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(INTERACTIVE_TARGETS) !== null;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export default function App() {
  const [activeScene, setActiveScene] = useState(0);
  const clickFlightRafRef = useRef(0);
  const clickFlightRunningRef = useRef(false);
  const activeSceneId = FLIGHT_SCENES[activeScene]?.id ?? "nebula";
  const canAdvance = activeScene < FLIGHT_SCENES.length - 1;
  const handleSceneChange = useCallback((index: number) => {
    setActiveScene(index);
  }, []);

  const runNebulaClickFlight = useCallback(() => {
    if (clickFlightRunningRef.current) return;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const startProgress = clamp01(window.scrollY / maxScroll);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      window.scrollTo(0, Math.round(maxScroll * NEBULA_CLICK_EXIT_PROGRESS));
      return;
    }

    clickFlightRunningRef.current = true;
    const startedAt = performance.now();
    const step = (now: number) => {
      const elapsed = clamp01((now - startedAt) / NEBULA_CLICK_FLIGHT_DURATION);
      let progress: number;

      if (elapsed < 0.82) {
        const cruise = easeInOutCubic(elapsed / 0.82);
        progress = startProgress + (NEBULA_CLICK_CRUISE_PROGRESS - startProgress) * cruise;
      } else {
        const exit = easeInOutCubic((elapsed - 0.82) / 0.18);
        progress = NEBULA_CLICK_CRUISE_PROGRESS +
          (NEBULA_CLICK_EXIT_PROGRESS - NEBULA_CLICK_CRUISE_PROGRESS) * exit;
      }

      window.scrollTo(0, Math.round(maxScroll * progress));
      if (elapsed < 1) {
        clickFlightRafRef.current = window.requestAnimationFrame(step);
        return;
      }

      clickFlightRafRef.current = 0;
      clickFlightRunningRef.current = false;
    };

    clickFlightRafRef.current = window.requestAnimationFrame(step);
  }, []);

  const advanceToNextScene = useCallback(() => {
    if (!canAdvance || clickFlightRunningRef.current) return;

    if (activeScene === 0) {
      runNebulaClickFlight();
      return;
    }

    const nextScene = FLIGHT_SCENES[activeScene + 1];
    const targetProgress = nextScene.start + (nextScene.end - nextScene.start) * 0.5;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: Math.round(maxScroll * targetProgress),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeScene, canAdvance, runNebulaClickFlight]);

  const handlePageClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!canAdvance || isInteractiveTarget(event.target)) return;
      advanceToNextScene();
    },
    [advanceToNextScene, canAdvance],
  );

  const handleAdvanceButton = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      advanceToNextScene();
    },
    [advanceToNextScene],
  );

  useScrollTimeline({ onSceneChange: handleSceneChange });

  useEffect(() => {
    if (activeScene >= 1) void loadSceneCanvas();
  }, [activeScene]);

  useEffect(
    () => () => {
      if (clickFlightRafRef.current !== 0) {
        window.cancelAnimationFrame(clickFlightRafRef.current);
      }
    },
    [],
  );

  return (
    <main
      className="app"
      data-active-scene={activeSceneId}
      data-can-advance={canAdvance ? "true" : "false"}
      aria-label="星海心灵旅程"
      onClick={handlePageClick}
    >
      {activeScene >= 2 ? (
        <Suspense fallback={null}>
          <SceneCanvas />
        </Suspense>
      ) : null}
      <HomeStarflightLayer />
      <GalaxyPlateLayer />
      <LandingSequenceLayer />
      <div className="cinemaVeil" aria-hidden="true" />
      <EarthLocator />
      <OverlayContent activeScene={activeScene} />
      <button
        type="button"
        className={`sceneAdvanceButton ${canAdvance ? "isVisible" : ""}`}
        aria-hidden={!canAdvance}
        disabled={!canAdvance}
        onClick={handleAdvanceButton}
      >
        <span className="sceneAdvanceIcon" aria-hidden="true">→</span>
        <span className="srOnly">继续探索</span>
      </button>
      <div className="scrollField" id="top" aria-hidden="true" />
    </main>
  );
}
