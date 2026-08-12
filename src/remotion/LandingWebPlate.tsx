import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CampfireLight } from "./LandingMobileMaster";
import { ReferenceLandingStars } from "./ReferenceLandingStars";

const DESKTOP_BACKGROUND = "scene-assets/landing-camp-bg.png";
const MOBILE_BACKGROUND = "scene-assets/landing-camp-mobile-user-reference-v12.png";

export function LandingWebPlate() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seconds = frame / fps;
  const portrait = height > width * 1.35;
  const background = portrait ? MOBILE_BACKGROUND : DESKTOP_BACKGROUND;
  const skySpan = portrait ? 0.43 : 0.5;

  return (
    <AbsoluteFill style={{ backgroundColor: "#020717", overflow: "hidden" }}>
      <Img
        src={staticFile(background)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          filter: portrait
            ? "brightness(1.015) contrast(1.015) saturate(1.035)"
            : "brightness(1.045) contrast(1.025) saturate(1.05)",
        }}
      />
      <ReferenceLandingStars
        seconds={seconds}
        width={width}
        height={height}
        skySpan={skySpan}
        variant={portrait ? "mobile" : "desktop"}
      />
      <CampfireLight
        seconds={seconds}
        width={width}
        height={height}
        x={portrait ? 0.449 : 0.497}
        y={portrait ? 0.769 : 0.866}
        glowWidth={portrait ? 0.29 : 0.12}
      />
    </AbsoluteFill>
  );
}

export function LandingWebMobileWithCopy() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#020717", overflow: "hidden" }}>
      <LandingWebPlate />
      <Img
        src={staticFile("scene-assets/landing-lockup-xiu-mobile.png")}
        style={{
          position: "absolute",
          top: 194,
          left: "50%",
          width: 637,
          height: "auto",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />
    </AbsoluteFill>
  );
}
