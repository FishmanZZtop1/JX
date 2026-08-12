import { FLIGHT_SCENES } from "../sceneData";
import ParticleTitle from "./ParticleTitle";

type OverlayContentProps = {
  activeScene: number;
};

export default function OverlayContent({ activeScene }: OverlayContentProps) {
  const shouldLoadLandingLockup = activeScene >= 3;

  return (
    <section className="copyStage" aria-live="polite">
      {FLIGHT_SCENES.map((scene, index) => (
        <article
          className={`copyBlock ${index === activeScene ? "isActive" : ""}`}
          data-has-title={scene.title ? "true" : "false"}
          data-scene={scene.id}
          key={scene.id}
        >
          {scene.id === "landing" ? (
            <div
              aria-label={`${scene.title} XIU。${scene.supporting.replaceAll("\n", "")}`}
              className="landingLockupFrame"
              role="img"
            >
              {shouldLoadLandingLockup ? (
                <picture className="landingLockupPicture">
                  <source
                    media="(max-width: 760px) and (orientation: portrait)"
                    srcSet="/scene-assets/landing-lockup-xiu-mobile.png"
                  />
                  <img
                    alt=""
                    className="landingLockupImage"
                    src="/scene-assets/landing-lockup-xiu.png"
                    decoding="async"
                    fetchPriority="low"
                  />
                </picture>
              ) : null}
            </div>
          ) : (
            <>
              {scene.title ? (
                <ParticleTitle
                  active={index === activeScene}
                  mobileText={scene.mobileTitle}
                  text={scene.title}
                />
              ) : null}
              <p>{scene.supporting}</p>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
