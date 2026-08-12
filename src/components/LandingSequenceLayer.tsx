import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";
import LandingStarfield from "./LandingStarfield";

const LANDING_START = 0.812;
const CLOUD_FULL = 0.858;
const CAMP_REVEAL = 0.868;
const CAMP_FULL = 0.922;
const CLOUD_CLEAR = 0.936;
const LANDING_PRELOAD_START = 0.64;
const LANDING_DESKTOP_SRC = "/scene-assets/landing-final-desktop-fine-milkyway-v9.mp4";
const LANDING_MOBILE_SRC = "/scene-assets/landing-final-mobile-fine-milkyway-v12.mp4";
type LandingDialog = "about" | "contact" | null;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default function LandingSequenceLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeDialog, setActiveDialog] = useState<LandingDialog>(null);

  useEffect(() => {
    if (!activeDialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDialog(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDialog]);

  useEffect(() => {
    let rafId = 0;
    let lastLayerOpacity = "";
    let lastLayerVisibility = "";
    const lastVars = new Map<string, string>();
    const mobileQuery = window.matchMedia("(max-width: 760px) and (orientation: portrait)");

    const syncVideoSource = () => {
      const video = videoRef.current;
      if (!video) return;
      if (!video.dataset.source && flightRuntime.progress < LANDING_PRELOAD_START) return;

      const nextSource = mobileQuery.matches ? LANDING_MOBILE_SRC : LANDING_DESKTOP_SRC;
      if (video.dataset.source === nextSource) return;

      const shouldResume = !video.paused;
      video.pause();
      video.preload = "auto";
      video.src = nextSource;
      video.dataset.source = nextSource;
      video.load();
      if (shouldResume) {
        void video.play().catch(() => undefined);
      }
    };

    const setLayerVar = (layer: HTMLDivElement, name: string, value: string) => {
      if (lastVars.get(name) === value) return;
      layer.style.setProperty(name, value);
      lastVars.set(name, value);
    };

    const syncVideo = (active: boolean) => {
      const video = videoRef.current;
      if (!video || !video.dataset.source) return;
      if (flightRuntime.reducedMotion) {
        if (!video.paused) video.pause();
        video.currentTime = 0;
        return;
      }
      if (active && video.paused) {
        void video.play().catch(() => undefined);
      } else if (!active && !video.paused) {
        video.pause();
      }
    };

    const tick = () => {
      rafId = 0;
      const progress = flightRuntime.progress;
      syncVideoSource();
      const layer = layerRef.current;
      const stage = smoothstep(LANDING_START, CLOUD_FULL, progress);
      const camp = smoothstep(CAMP_REVEAL, CAMP_FULL, progress);
      const cloudClear = smoothstep(CAMP_REVEAL, CLOUD_CLEAR, progress);
      const sceneReveal = smoothstep(CLOUD_FULL - 0.01, CLOUD_FULL, progress);
      const cloudOpacity = stage * (1 - cloudClear);
      const opacity = Math.max(stage * 0.86, sceneReveal);

      if (layer) {
        const nextOpacity = opacity.toFixed(4);
        const nextVisibility = opacity > 0.01 ? "visible" : "hidden";

        if (nextOpacity !== lastLayerOpacity) {
          layer.style.opacity = nextOpacity;
          lastLayerOpacity = nextOpacity;
        }
        if (nextVisibility !== lastLayerVisibility) {
          layer.style.visibility = nextVisibility;
          lastLayerVisibility = nextVisibility;
        }

        setLayerVar(layer, "--landing-scene-opacity", sceneReveal.toFixed(4));
        setLayerVar(layer, "--landing-cloud-opacity", cloudOpacity.toFixed(4));
        setLayerVar(layer, "--landing-cloud-back-x", `${((cloudClear - 0.5) * -11).toFixed(3)}vw`);
        setLayerVar(layer, "--landing-cloud-back-y", `${(cloudClear * -5).toFixed(3)}vh`);
        setLayerVar(layer, "--landing-cloud-back-scale-x", (1.14 + cloudClear * 0.16).toFixed(4));
        setLayerVar(layer, "--landing-cloud-back-scale-y", (1.08 + cloudClear * 0.14).toFixed(4));
        setLayerVar(layer, "--landing-cloud-front-x", `${(cloudClear * 13).toFixed(3)}vw`);
        setLayerVar(layer, "--landing-cloud-front-y", `${(cloudClear * 5).toFixed(3)}vh`);
        setLayerVar(layer, "--landing-cloud-front-scale-x", (1.06 + cloudClear * 0.28).toFixed(4));
        setLayerVar(layer, "--landing-cloud-front-scale-y", (1.04 + cloudClear * 0.18).toFixed(4));
        setLayerVar(layer, "--landing-night-opacity", (camp * 0.3).toFixed(4));
      }

      syncVideo(opacity > 0.04);
    };

    syncVideoSource();
    mobileQuery.addEventListener?.("change", syncVideoSource);
    window.addEventListener("resize", syncVideoSource, { passive: true });
    const wake = () => {
      if (rafId === 0) rafId = window.requestAnimationFrame(tick);
    };
    const unsubscribe = subscribeFlightRuntime(wake);
    wake();
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      unsubscribe();
      mobileQuery.removeEventListener?.("change", syncVideoSource);
      window.removeEventListener("resize", syncVideoSource);
    };
  }, []);

  return (
    <div ref={layerRef} className="landingSequenceLayer" aria-label="锦宿星空场景">
      <video ref={videoRef} className="landingMotionPlate" muted loop playsInline preload="none" />
      <LandingStarfield />
      <span className="landingCloudCover landingCloudCoverBack" />
      <span className="landingCloudCover landingCloudCoverFront" />
      <span className="landingNightGrade" />
      <footer className="landingLegalLine" aria-label="网站信息">
        <div className="landingLegalGroup landingLegalIdentity">
          <span className="landingLegalLogo">锦宿 XIU</span>
          <span>上海粒之科技有限公司</span>
        </div>
        <div className="landingLegalGroup landingLegalNav" aria-label="网站导航">
          <span>
            <button type="button" className="landingLegalButton" onClick={() => setActiveDialog("about")}>
              关于我们
            </button>
          </span>
          <span>
            <button type="button" className="landingLegalButton" onClick={() => setActiveDialog("contact")}>
              联系我们
            </button>
          </span>
          <span>隐私与条款</span>
        </div>
        <div className="landingLegalGroup landingLegalMeta">
          <span>© 2026 锦宿 XIU</span>
          <span>ICP备案信息</span>
        </div>
      </footer>

      {activeDialog
        ? createPortal(
            <div
              className="landingGlassScrim"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setActiveDialog(null);
              }}
            >
              <section
                className="landingGlassDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`landing-${activeDialog}-title`}
              >
                <button
                  type="button"
                  className="landingGlassClose"
                  aria-label="关闭弹窗"
                  autoFocus
                  onClick={() => setActiveDialog(null)}
                >
                  ×
                </button>
                <img className="landingGlassLogo" src="/brand/jinxiu-logo.png" alt="锦宿 JINXIU" />
                {activeDialog === "about" ? (
                  <div className="landingGlassContent">
                    <p className="landingGlassEyebrow">JINXIU</p>
                    <h2 id="landing-about-title">上海粒之科技介绍</h2>
                    <p>
                      上海粒之科技有限公司成立于2024年，属于互联网+文化精神领域，主营业务为To C
                      APP产品，具有AI功能，致力于为用户提供心理、精神、人文类的线上支持。
                    </p>
                  </div>
                ) : (
                  <div className="landingGlassContent landingGlassContact">
                    <p className="landingGlassEyebrow">CONTACT</p>
                    <h2 id="landing-contact-title">联系我们</h2>
                    <a href="mailto:bussiness@shlizhikj.com">bussiness@shlizhikj.com</a>
                  </div>
                )}
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
