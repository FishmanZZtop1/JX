import { useEffect, useRef } from "react";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default function EarthLocator() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let lastOpacity = "";
    let lastAxisRotation = "";

    const tick = () => {
      rafId = 0;
      const progress = flightRuntime.progress;
      const arrival = smoothstep(0.315, 0.35, progress);
      const departure = smoothstep(0.49, 0.545, progress);
      const opacity = arrival * (1 - departure);
      const axisRotation = smoothstep(0.315, 0.505, progress) * 18;
      const nextOpacity = opacity.toFixed(4);
      const nextAxisRotation = `${axisRotation.toFixed(3)}deg`;

      if (layerRef.current) {
        if (nextOpacity !== lastOpacity) {
          layerRef.current.style.opacity = nextOpacity;
          layerRef.current.style.visibility = opacity > 0.006 ? "visible" : "hidden";
          lastOpacity = nextOpacity;
        }
        if (nextAxisRotation !== lastAxisRotation) {
          layerRef.current.style.setProperty("--earth-axis-rotation", nextAxisRotation);
          lastAxisRotation = nextAxisRotation;
        }
      }
    };

    const wake = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(tick);
    };
    const unsubscribe = subscribeFlightRuntime(wake);
    wake();
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, []);

  return (
    <div ref={layerRef} className="earthObservation" aria-hidden="true">
      <span className="earthObservationDust" />
      <span className="earthLocator">
        <span className="earthLocatorLabel">Earth</span>
        <span className="earthLocatorRing" />
      </span>
    </div>
  );
}
