import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";
import CameraRig from "./CameraRig";
import EarthSection from "./EarthSection";
import StarField, { TransitionStarVeil } from "./StarField";

function dprRange(): [number, number] {
  const lowPerformance =
    window.matchMedia("(max-width: 760px)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    (navigator.hardwareConcurrency || 8) <= 4;
  return lowPerformance ? [0.82, 1] : [1, 1.25];
}

function SceneFrameDriver() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let rafId = 0;

    const shouldAnimate = () =>
      document.visibilityState === "visible" &&
      flightRuntime.progress >= 0.27 &&
      flightRuntime.progress < 0.965;

    const tick = () => {
      rafId = 0;
      invalidate();
      if (shouldAnimate()) rafId = window.requestAnimationFrame(tick);
    };

    const wake = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(tick);
    };

    const unsubscribe = subscribeFlightRuntime(wake);
    document.addEventListener("visibilitychange", wake);
    wake();

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", wake);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, [invalidate]);

  return null;
}

export default function SceneCanvas() {
  return (
    <div className="sceneCanvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 22], fov: 42, near: 0.1, far: 180 }}
        dpr={dprRange()}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        frameloop="demand"
      >
        <fog attach="fog" args={["#02030a", 30, 178]} />
        <ambientLight intensity={0.32} color="#a8c6ff" />
        <directionalLight position={[-7, 4, 4]} intensity={1.7} color="#e3eeff" />

        <SceneFrameDriver />
        <CameraRig />
        <StarField />
        <TransitionStarVeil />

        <Suspense fallback={null}>
          <EarthSection />
        </Suspense>
      </Canvas>
    </div>
  );
}
