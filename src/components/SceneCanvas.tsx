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
  const pixelBudget = lowPerformance ? 1_900_000 : 4_200_000;
  const viewportPixels = Math.max(1, window.innerWidth * window.innerHeight);
  const budgetedDpr = Math.sqrt(pixelBudget / viewportPixels);
  const minimumDpr = lowPerformance ? 0.72 : 0.62;
  const maximumDpr = lowPerformance ? 1 : 1.25;
  const dpr = Math.min(maximumDpr, Math.max(minimumDpr, budgetedDpr));
  return [dpr, dpr];
}

function SceneFrameDriver() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let rafId = 0;

    const shouldAnimate = () =>
      document.visibilityState === "visible" &&
      flightRuntime.progress >= 0.27 &&
      // The landing sequence owns the final viewport. Stop the 3D render loop
      // before its video and canvas effects become visible on top of it. The
      // timeline still invalidates one frame per scroll update after this
      // point, so the Earth remains responsive without a second free-running RAF.
      flightRuntime.progress < 0.78;

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
