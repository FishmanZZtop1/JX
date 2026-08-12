import { registerRoot, Composition } from "remotion";
import { HomeStarflight } from "./HomeStarflight";
import { LandingCampSky } from "./LandingCampSky";
import {
  LandingMobileMaster,
  LandingMobileMasterLatestCopy,
} from "./LandingMobileMaster";
import { LandingWebMobileWithCopy, LandingWebPlate } from "./LandingWebPlate";
import { NebulaBubble } from "./NebulaBubble";

function RemotionRoot() {
  return (
    <>
      <Composition
        id="NebulaBubble"
        component={NebulaBubble}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HomeStarflightIdle"
        component={HomeStarflight}
        durationInFrames={720}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ mode: "idle" }}
      />
      <Composition
        id="HomeStarflightFlight"
        component={HomeStarflight}
        durationInFrames={600}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ mode: "flight" }}
      />
      <Composition
        id="HomeStarflightReverse"
        component={HomeStarflight}
        durationInFrames={600}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ mode: "reverse" }}
      />
      <Composition
        id="LandingCampSky"
        component={LandingCampSky}
        durationInFrames={600}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="LandingMobileMaster"
        component={LandingMobileMaster}
        durationInFrames={180}
        fps={30}
        width={1440}
        height={3120}
      />
      <Composition
        id="LandingMobileMasterLatestCopy"
        component={LandingMobileMasterLatestCopy}
        durationInFrames={90}
        fps={30}
        width={1440}
        height={3120}
      />
      <Composition
        id="LandingWebDesktop"
        component={LandingWebPlate}
        durationInFrames={360}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="LandingWebMobile"
        component={LandingWebPlate}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={2340}
      />
      <Composition
        id="LandingWebMobileWithCopy"
        component={LandingWebMobileWithCopy}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={2340}
      />
    </>
  );
}

registerRoot(RemotionRoot);
