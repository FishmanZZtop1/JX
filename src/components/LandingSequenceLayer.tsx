import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { flightRuntime, subscribeFlightRuntime } from "../flightStore";
import LandingStarfield from "./LandingStarfield";

const LANDING_START = 0.812;
const CLOUD_FULL = 0.858;
const CAMP_REVEAL = 0.868;
const CAMP_FULL = 0.922;
const CLOUD_CLEAR = 0.936;
const LANDING_PRELOAD_START = 0.74;
const LANDING_UNLOAD_START = 0.58;
const LANDING_DESKTOP_SRC = "/scene-assets/landing-final-desktop-fine-milkyway-v9.mp4";
const LANDING_MOBILE_SRC = "/scene-assets/landing-final-mobile-fine-milkyway-v12.mp4";
type LandingDialog = "about" | "contact" | "download" | "privacy" | null;

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
      const progress = flightRuntime.progress;

      if (video.dataset.source && progress < LANDING_UNLOAD_START) {
        video.pause();
        video.removeAttribute("src");
        delete video.dataset.source;
        video.load();
        return;
      }
      if (!video.dataset.source && progress < LANDING_PRELOAD_START) return;

      const nextSource = mobileQuery.matches ? LANDING_MOBILE_SRC : LANDING_DESKTOP_SRC;
      if (video.dataset.source === nextSource) return;

      const shouldResume = !video.paused;
      video.pause();
      // The short lead-in lets the decoder fill a small buffer before the
      // cloud reveal, while avoiding a video decoder living beside the Earth
      // scene for most of the page.
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
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        delete video.dataset.source;
        video.load();
      }
    };
  }, []);

  return (
    <div ref={layerRef} className="landingSequenceLayer" aria-label="锦宿星空场景">
      <video ref={videoRef} className="landingMotionPlate" muted loop playsInline preload="none" />
      <LandingStarfield />
      <span className="landingCloudCover landingCloudCoverBack" />
      <span className="landingCloudCover landingCloudCoverFront" />
      <span className="landingNightGrade" />
      <header className="landingHeader" aria-label="锦宿导航">
        <button
          type="button"
          className="landingBrandButton"
          aria-label="返回首页"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="landingBrandLockup" aria-hidden="true">
            <img src="/scene-assets/landing-lockup-xiu.png" alt="" />
          </span>
        </button>
        <button
          type="button"
          className="landingDownloadButton"
          onClick={() => setActiveDialog("download")}
        >
          下载APP
        </button>
      </header>
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
          <span>
            <button type="button" className="landingLegalButton" onClick={() => setActiveDialog("privacy")}>
              隐私与条款
            </button>
          </span>
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
                className={`landingGlassDialog landingGlassDialog--${activeDialog}`}
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
                      我们做了一个融合了哲学智慧与AI心理温度的空间。当你需要一对一的支持，AI伙伴陪伴你，看见你的情绪，慢慢探索你的内在，支持个人内在成长。当你需要与更多信息和人链接，锦宿社区的哲学、心理类内容和同类用户触发你的情绪，引发你的思考。
                    </p>
                    <p>
                      我们相信，每个人都有自我成长的力量，只是有时需要一个温柔的回声。
                    </p>
                  </div>
                ) : activeDialog === "contact" ? (
                  <div className="landingGlassContent landingGlassContact">
                    <p className="landingGlassEyebrow">CONTACT</p>
                    <h2 id="landing-contact-title">联系我们</h2>
                    <a href="mailto:bussiness@shlizhikj.com">bussiness@shlizhikj.com</a>
                  </div>
                ) : activeDialog === "download" ? (
                  <div className="landingGlassContent landingDownloadContent">
                    <p className="landingGlassEyebrow">JINXIU APP</p>
                    <h2 id="landing-download-title">下载锦宿</h2>
                    <p>在移动端，随时回到属于你的内在空间。</p>
                    <div className="landingStoreGrid">
                      <a
                        className="landingStoreCard"
                        href="https://a.app.qq.com/o/render?pkgname=com.benben.jinxiu&template_id=391shcrfne"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="landingStoreIcon landingStoreIconApple" aria-hidden="true"></span>
                        <span>
                          <small>ios下载</small>
                          <strong>App Store</strong>
                        </span>
                      </a>
                      <div className="landingStoreCard" role="group" aria-label="安卓下载">
                        <span className="landingStoreIcon landingStoreIconPlay" aria-hidden="true">
                          <span />
                        </span>
                        <span>
                          <small>安卓下载</small>
                          <strong>各大应用市场均可下载</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <article className="landingGlassContent landingPrivacyContent">
                    <p className="landingGlassEyebrow">JINXIU PRIVACY</p>
                    <h2 id="landing-privacy-title">锦宿隐私政策</h2>
                    <p className="landingPrivacyUpdated">更新日期：2026年8月13日</p>
                    <p>锦宿Xiu重视你的隐私。本政策用于说明我们如何在官网及相关服务中处理你的信息，以及你可以如何管理这些信息。</p>
                    <h3>一、我们收集的信息</h3>
                    <p>当你浏览官网时，我们仅处理完成页面访问、运行和安全防护所必需的技术信息。使用锦宿产品时，可能根据功能需要处理账号信息、设备信息、使用日志以及你主动提交的内容。</p>
                    <h3>二、信息的使用</h3>
                    <p>我们使用相关信息提供、维护和改进产品，响应你的咨询，保障账号与服务安全，并在获得必要授权后向你提供个性化的内容与体验。</p>
                    <h3>三、AI伙伴与社区内容</h3>
                    <p>你与AI伙伴的对话可能包含情绪、心理和生活信息。我们会按照适用法律和产品规则进行处理，用于提供对话、记忆和安全能力。请勿在对话中提交身份证号、银行卡密码等高度敏感信息。你在社区发布的内容应遵守法律法规和社区规则。</p>
                    <h3>四、第三方服务</h3>
                    <p>为实现登录、消息、支付、统计或安全防护等功能，产品可能接入必要的第三方服务。我们会要求其按照适用法律、合同及最小必要原则处理信息，并在产品内以适当方式说明。</p>
                    <h3>五、信息存储与安全</h3>
                    <p>我们会采取访问控制、加密传输和安全审计等措施保护信息，并在实现处理目的所必需的期限内保存。发生安全事件时，我们会依法采取补救措施并履行通知义务。</p>
                    <h3>六、你的权利</h3>
                    <p>你可以通过产品功能或联系我们，查询、更正、删除个人信息，撤回授权，注销账号，或对信息处理提出意见。我们会在法律规定的期限内处理你的请求。</p>
                    <h3>七、未成年人保护</h3>
                    <p>请在监护人同意和指导下使用相关服务。若我们发现未经监护人同意收集了未成年人信息，将依法尽快删除或采取其他必要措施。</p>
                    <h3>八、政策更新与联系我们</h3>
                    <p>我们可能根据服务变化或法律要求更新本政策，并在官网或产品内提示重要变化。如对隐私政策有疑问，请联系：bussiness@shlizhikj.com。</p>
                  </article>
                )}
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
