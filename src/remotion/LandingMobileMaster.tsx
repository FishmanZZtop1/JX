import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type TwinkleStar = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  cross: boolean;
  cycles: number;
};

type Ember = {
  x: number;
  height: number;
  phase: number;
  duration: number;
  size: number;
};

type GalaxyFlowPatch = {
  t: number;
  size: number;
  phase: number;
  color: string;
};

type GalaxyBloom = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  cycles: number;
};

const BACKGROUND = "scene-assets/landing-camp-mobile-master-2x.png";
const LOOP_SECONDS = 6;

function seeded(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(): TwinkleStar[] {
  const random = seeded(16072026);
  const colors = ["#ffffff", "#eef5ff", "#cfe0ff", "#dfd0ff", "#b7adff", "#9fbfff"];
  const columns = 18;
  const rows = 13;

  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rare = random() > 0.91;

    return {
      x: (column + 0.22 + random() * 0.56) / columns,
      y: 0.012 + ((row + 0.12 + random() * 0.76) / rows) * 0.418,
      size: rare ? 7.2 + random() * 5.2 : 2.7 + random() * 2.8,
      alpha: rare ? 0.92 + random() * 0.08 : 0.64 + random() * 0.34,
      phase: random() * Math.PI * 2,
      color: colors[Math.floor(random() * colors.length)],
      cross: rare,
      cycles: random() > 0.68 ? 2 : 1,
    };
  });
}

function galaxyCenterX(y: number) {
  const t = Math.max(0, Math.min(1, (y - 0.008) / 0.402));
  return 0.055 + t * 0.5 + Math.sin(t * Math.PI * 1.35) * 0.024;
}

function makeGalaxyStars(): TwinkleStar[] {
  const random = seeded(17072026);
  const colors = ["#ffffff", "#f2f6ff", "#d4e3ff", "#c9d8ff", "#d5c5ff", "#ad9fff", "#8dbbff"];

  return Array.from({ length: 520 }, () => {
    const y = 0.008 + random() * 0.402;
    const t = (y - 0.008) / 0.402;
    const spread = 0.062 + Math.sin(t * Math.PI) * 0.082;
    const tiny = random() < 0.3;
    const rare = !tiny && random() > 0.965;
    const x = galaxyCenterX(y) + (random() + random() - 1) * spread;

    return {
      x: Math.max(0.008, Math.min(0.82, x)),
      y,
      size: rare ? 7.4 + random() * 5.8 : tiny ? 1.8 + random() * 1.7 : 3.1 + random() * 3.5,
      alpha: rare ? 0.94 + random() * 0.06 : tiny ? 0.46 + random() * 0.4 : 0.7 + random() * 0.28,
      phase: random() * Math.PI * 2,
      color: colors[Math.floor(random() * colors.length)],
      cross: rare,
      cycles: random() > 0.58 ? 2 : 1,
    };
  });
}

function makeGalaxyBlooms(): GalaxyBloom[] {
  const random = seeded(27172026);
  const colors = ["#ffffff", "#dce8ff", "#c8b9ff", "#a99cff"];

  return Array.from({ length: 18 }, (_, index) => {
    const t = 0.025 + ((index + random() * 0.82) / 18) * 0.95;
    const y = 0.008 + t * 0.402;
    const x = galaxyCenterX(y) + (random() - 0.5) * (0.035 + Math.sin(t * Math.PI) * 0.045);

    return {
      x: Math.max(0.008, Math.min(0.78, x)),
      y,
      size: 3.4 + random() * 6.2,
      alpha: 0.38 + random() * 0.28,
      phase: random() * Math.PI * 2,
      color: colors[Math.floor(random() * colors.length)],
      cycles: random() > 0.72 ? 2 : 1,
    };
  });
}

function makeGalaxyFlowPatches(): GalaxyFlowPatch[] {
  const random = seeded(314159);
  const colors = ["rgba(105,150,255,0.42)", "rgba(145,108,255,0.38)", "rgba(210,196,255,0.34)"];

  return Array.from({ length: 11 }, (_, index) => ({
    t: 0.045 + (index / 10) * 0.9,
    size: 0.78 + random() * 0.48,
    phase: random() * Math.PI * 2,
    color: colors[Math.floor(random() * colors.length)],
  }));
}

function makeEmbers(): Ember[] {
  const random = seeded(271828);
  return Array.from({ length: 16 }, () => ({
    x: (random() - 0.5) * 96,
    height: 70 + random() * 170,
    phase: random(),
    duration: 2.7 + random() * 2.2,
    size: 2.4 + random() * 4.8,
  }));
}

const STARS = makeStars();
const GALAXY_STARS = makeGalaxyStars();
const GALAXY_BLOOMS = makeGalaxyBlooms();
const GALAXY_FLOW_PATCHES = makeGalaxyFlowPatches();
const EMBERS = makeEmbers();

export function GalaxyFlowLayer({
  seconds,
  width,
  height,
  background = BACKGROUND,
  textureStrength = 1,
}: {
  seconds: number;
  width: number;
  height: number;
  background?: string;
  textureStrength?: number;
}) {
  const cycle = (seconds / LOOP_SECONDS) * Math.PI * 2;
  const driftX = Math.sin(cycle) * width * 0.017;
  const driftY = Math.cos(cycle) * height * 0.007;
  const textureOpacity = 0.25 + (Math.sin(cycle - 0.5) * 0.5 + 0.5) * 0.11;
  const galaxyMask = [
    "radial-gradient(ellipse 27% 15% at 3% 2%, #000 0%, #000 38%, transparent 100%)",
    "radial-gradient(ellipse 31% 18% at 18% 13%, #000 0%, #000 34%, transparent 100%)",
    "radial-gradient(ellipse 34% 20% at 35% 26%, #000 0%, #000 32%, transparent 100%)",
    "radial-gradient(ellipse 29% 18% at 52% 39%, #000 0%, #000 28%, transparent 100%)",
  ].join(", ");
  const ridgeMask = [
    "radial-gradient(ellipse 15% 7% at 2% 2%, #000 0%, transparent 100%)",
    "radial-gradient(ellipse 18% 8% at 18% 13%, #000 0%, transparent 100%)",
    "radial-gradient(ellipse 20% 9% at 35% 26%, #000 0%, transparent 100%)",
    "radial-gradient(ellipse 18% 8% at 52% 39%, #000 0%, transparent 100%)",
  ].join(", ");

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {textureStrength > 0 ? (
        <>
          <Img
            src={staticFile(background)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              opacity: textureOpacity * textureStrength,
              filter: "brightness(1.42) contrast(1.16) saturate(1.34) hue-rotate(4deg)",
              WebkitMaskImage: galaxyMask,
              maskImage: galaxyMask,
              transform: `translate3d(${driftX}px, ${driftY}px, 0) scale3d(1.012, 1.012, 1)`,
              transformOrigin: "30% 24%",
            }}
          />
          <Img
            src={staticFile(background)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              opacity: (0.16 + (Math.cos(cycle + 0.7) * 0.5 + 0.5) * 0.1) * textureStrength,
              filter: "brightness(1.7) contrast(1.22) saturate(1.5) hue-rotate(-4deg)",
              WebkitMaskImage: ridgeMask,
              maskImage: ridgeMask,
              transform: `translate3d(${-driftX * 0.72}px, ${-driftY * 0.6}px, 0) scale3d(1.018, 1.018, 1)`,
              transformOrigin: "30% 24%",
            }}
          />
        </>
      ) : null}
      {GALAXY_FLOW_PATCHES.map((patch, index) => {
        const y = 0.012 + patch.t * 0.395;
        const x = galaxyCenterX(y);
        const wave = Math.sin(cycle + patch.phase) * 0.5 + 0.5;
        const xShift = Math.sin(cycle + patch.phase * 0.7) * width * 0.012;
        const yShift = Math.cos(cycle + patch.phase * 0.6) * height * 0.005;

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: x * width + xShift,
              top: y * height + yShift,
              width: width * (0.16 + patch.size * 0.08),
              height: height * (0.045 + patch.size * 0.022),
              borderRadius: "50%",
              background: `radial-gradient(ellipse, ${patch.color} 0%, rgba(106,112,255,0.07) 42%, transparent 74%)`,
              opacity: 0.42 + wave * 0.32,
              filter: "blur(17px)",
              transform: `translate3d(-50%, -50%, 0) rotate(58deg) scale3d(${0.9 + wave * 0.18}, ${0.94 + wave * 0.14}, 1)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

export function GalaxyBloomLayer({ seconds, width, height }: { seconds: number; width: number; height: number }) {
  const cycle = (seconds / LOOP_SECONDS) * Math.PI * 2;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {GALAXY_BLOOMS.map((bloom, index) => {
        const wave = Math.sin(cycle * bloom.cycles + bloom.phase) * 0.5 + 0.5;
        const t = Math.max(0, Math.min(1, (bloom.y - 0.008) / 0.402));
        const sweepWave = Math.max(0, Math.cos(cycle - t * Math.PI * 2));
        const sweep = sweepWave ** 7;
        const sparkle = Math.min(1.18, wave ** 4 + sweep * 0.9);
        const opacity = Math.min(1, bloom.alpha * (0.16 + sparkle * 1.12));
        const scale = 0.78 + sparkle * 0.68;
        const ray = bloom.size * (0.8 + sparkle * 0.9);

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: bloom.x * width,
              top: bloom.y * height,
              width: bloom.size,
              height: bloom.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, #ffffff 0%, ${bloom.color} 8%, rgba(168,184,255,0.42) 26%, transparent 74%)`,
              opacity,
              filter: "blur(0.12px)",
              boxShadow: `0 0 ${bloom.size * (0.35 + sparkle * 0.5)}px ${bloom.color}`,
              transform: `translate3d(-50%, -50%, 0) scale3d(${scale}, ${scale}, 1)`,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: ray,
                height: 0.7,
                background: `linear-gradient(90deg, transparent, ${bloom.color}, transparent)`,
                transform: "translate3d(-50%, -50%, 0)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 0.7,
                height: ray,
                background: `linear-gradient(180deg, transparent, ${bloom.color}, transparent)`,
                transform: "translate3d(-50%, -50%, 0)",
              }}
            />
          </span>
        );
      })}
    </AbsoluteFill>
  );
}

export function StarLayer({
  stars,
  seconds,
  width,
  height,
  glowScale = 1,
  pathSpan = 0.402,
  pointScale = 1,
  cinematic = false,
}: {
  stars: TwinkleStar[];
  seconds: number;
  width: number;
  height: number;
  glowScale?: number;
  pathSpan?: number;
  pointScale?: number;
  cinematic?: boolean;
}) {
  const cycle = (seconds / LOOP_SECONDS) * Math.PI * 2;
  const twinkleCycle = cinematic ? cycle * 2 : cycle;

  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {stars.map((star, index) => {
        const wave = Math.sin(twinkleCycle * star.cycles + star.phase) * 0.5 + 0.5;
        const eased = wave * wave * (3 - 2 * wave);
        const t = Math.max(0, Math.min(1, (star.y - 0.008) / pathSpan));
        const sweepWave = cinematic ? Math.max(0, Math.cos(twinkleCycle - t * Math.PI * 2)) : 0;
        const sweep = sweepWave ** 4;
        const sparkle = cinematic
          ? Math.min(1.36, eased * 0.48 + sweep * 1.26)
          : Math.min(1.2, eased * 1.1);
        const opacity = Math.min(1, star.alpha * ((cinematic ? 0.16 : 0.12) + sparkle * (cinematic ? 1.1 : 1.12)));
        const size = star.size * pointScale * (cinematic ? 0.98 + sparkle * 0.035 : 0.96 + sparkle * 0.045);
        const x = star.x * width;
        const y = star.y * height;
        const ray = size * (star.cross ? 2.35 + sparkle * 1.55 : 1.4 + sparkle * 1.25) * glowScale;
        const rayThickness = Math.max(star.cross ? 0.68 : 0.55, size * 0.13);

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              backgroundColor: star.color,
              opacity,
              boxShadow: `0 0 ${(3.2 + sparkle * 9.4) * glowScale}px ${star.color}`,
            }}
          >
            {star.cross ? (
              <>
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: ray,
                    height: rayThickness,
                    background: `linear-gradient(90deg, transparent, ${star.color}, transparent)`,
                    transform: "translate3d(-50%, -50%, 0)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: rayThickness,
                    height: ray,
                    background: `linear-gradient(180deg, transparent, ${star.color}, transparent)`,
                    transform: "translate3d(-50%, -50%, 0)",
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

export function CampfireLight({
  seconds,
  width,
  height,
  x = 0.449,
  y = 0.769,
  glowWidth = 0.29,
}: {
  seconds: number;
  width: number;
  height: number;
  x?: number;
  y?: number;
  glowWidth?: number;
}) {
  const fireX = width * x;
  const fireY = height * y;
  const loop = (seconds / LOOP_SECONDS) * Math.PI * 2;
  const pulse =
    0.5 +
    Math.sin(loop + 0.4) * 0.27 +
    Math.sin(loop * 2 + 1.7) * 0.16;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: fireX,
          top: fireY,
          width: width * glowWidth,
          height: width * glowWidth * 0.79,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(255,180,70,0.26) 0%, rgba(255,101,20,0.12) 37%, transparent 72%)",
          opacity: 0.52 + pulse * 0.12,
          filter: "blur(22px)",
          mixBlendMode: "screen",
          transform: "translate3d(-50%, -58%, 0)",
        }}
      />
      {EMBERS.map((ember, index) => {
        const raw = ((seconds / LOOP_SECONDS) * (index % 3 === 0 ? 2 : 1) + ember.phase) % 1;
        const rise = raw * raw * (3 - 2 * raw);
        const opacity = Math.sin(raw * Math.PI) * 0.62;
        const sideDrift = Math.sin(raw * Math.PI * 2 + ember.phase * 8) * 17;

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: fireX + ember.x + sideDrift,
              top: fireY - 34 - rise * ember.height,
              width: ember.size,
              height: ember.size,
              borderRadius: "50%",
              background: index % 3 === 0 ? "#fff3c4" : "#ff9a3b",
              opacity,
              boxShadow: "0 0 9px rgba(255,126,31,0.92)",
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Copy() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 300,
        width: "88%",
        transform: "translateX(-50%)",
        textAlign: "center",
        color: "white",
      }}
    >
      <div
        style={{
          fontFamily: '"Songti SC", "STSong", "Source Han Serif SC", serif',
          fontSize: 346,
          fontWeight: 560,
          lineHeight: 0.92,
          letterSpacing: "0.035em",
          textShadow: "0 3px 5px rgba(0,0,0,0.9), 0 12px 34px rgba(0,0,0,0.42)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        锦宿
      </div>
      <div
        style={{
          marginTop: 76,
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          fontSize: 58,
          fontWeight: 360,
          lineHeight: 2.02,
          letterSpacing: "0.055em",
          color: "rgba(250,252,255,0.96)",
          textShadow: "0 3px 5px rgba(0,0,0,0.94), 0 9px 26px rgba(0,0,0,0.68)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div>在这里，没有催促与评判，</div>
        <div>只有自然的节律、安静的陪伴，</div>
        <div>以及属于你的片刻停留。</div>
      </div>
    </div>
  );
}

function LatestCopy() {
  return (
    <Img
      src={staticFile("scene-assets/landing-lockup-xiu-mobile.png")}
      style={{
        position: "absolute",
        top: 259,
        left: "50%",
        width: 849,
        height: "auto",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    />
  );
}

function LandingMobileMasterScene({ latestCopy = false }: { latestCopy?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seconds = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#020717", overflow: "hidden" }}>
      <Img
        src={staticFile(BACKGROUND)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          filter: "brightness(1.015) contrast(1.015) saturate(1.035)",
        }}
      />
      <GalaxyFlowLayer seconds={seconds} width={width} height={height} />
      <StarLayer stars={STARS} seconds={seconds} width={width} height={height} glowScale={1.12} />
      <StarLayer
        stars={GALAXY_STARS}
        seconds={seconds}
        width={width}
        height={height}
        glowScale={1.58}
        cinematic
      />
      <GalaxyBloomLayer seconds={seconds} width={width} height={height} />
      <CampfireLight seconds={seconds} width={width} height={height} />
      {latestCopy ? <LatestCopy /> : <Copy />}
    </AbsoluteFill>
  );
}

export function LandingMobileMaster() {
  return <LandingMobileMasterScene />;
}

export function LandingMobileMasterLatestCopy() {
  return <LandingMobileMasterScene latestCopy />;
}
