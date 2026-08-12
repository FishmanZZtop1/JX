import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const W = 1920;
const H = 1080;

function loopProgress(frame: number, durationInFrames: number) {
  return (frame % durationInFrames) / durationInFrames;
}

function wave(progress: number, phase = 0) {
  return Math.sin((progress + phase) * Math.PI * 2);
}

function breathe(progress: number, phase = 0) {
  return interpolate(wave(progress, phase), [-1, 1], [0, 1], {
    easing: Easing.bezier(0.2, 0.9, 0.3, 1),
  });
}

export function NebulaBubble() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = loopProgress(frame, durationInFrames);
  const p2 = loopProgress(frame + durationInFrames / 2, durationInFrames);
  const breathA = breathe(p);
  const breathB = breathe(p, 0.32);
  const driftX = wave(p, 0.08) * 24 + wave(p, 0.71) * 10;
  const driftY = wave(p, 0.31) * 18 + wave(p, 0.83) * 7;
  const shellScale = 1 + breathA * 0.035 + wave(p, 0.57) * 0.012;
  const rimScale = 1.03 + breathB * 0.028;
  const rotation = wave(p, 0.18) * 2.5 + p * 6;
  const counterRotation = -wave(p2, 0.22) * 2.2 - p * 4.5;
  const turbulenceA = 0.012 + breathA * 0.004;
  const turbulenceB = 0.018 + breathB * 0.006;
  const displacementA = 42 + breathB * 24;
  const displacementB = 62 + breathA * 28;
  const shimmerOpacity = 0.2 + breathA * 0.22;
  const shellOpacity = 0.74 + breathA * 0.18;
  const rimOpacity = 0.58 + breathB * 0.18;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <radialGradient id="cyanShell" cx="48%" cy="49%" r="62%">
            <stop offset="0%" stopColor="rgba(82, 238, 255, 0.58)" />
            <stop offset="34%" stopColor="rgba(75, 148, 255, 0.42)" />
            <stop offset="66%" stopColor="rgba(214, 72, 255, 0.34)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          <radialGradient id="magentaShell" cx="43%" cy="58%" r="68%">
            <stop offset="0%" stopColor="rgba(255, 88, 226, 0.58)" />
            <stop offset="38%" stopColor="rgba(255, 62, 142, 0.36)" />
            <stop offset="74%" stopColor="rgba(255, 181, 70, 0.28)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          <linearGradient id="amberArc" x1="25%" y1="22%" x2="72%" y2="70%">
            <stop offset="0%" stopColor="rgba(255, 214, 80, 0)" />
            <stop offset="28%" stopColor="rgba(255, 200, 72, 0.5)" />
            <stop offset="52%" stopColor="rgba(255, 82, 170, 0.58)" />
            <stop offset="84%" stopColor="rgba(70, 228, 255, 0.38)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>
          <filter id="softBubbleA" filterUnits="userSpaceOnUse" x="-240" y="-180" width={W + 480} height={H + 360}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={(44 + breathB * 10).toFixed(2)} />
            <feColorMatrix
              type="matrix"
              values="1.42 0 0 0 0  0 1.3 0 0 0  0 0 1.72 0 0  0 0 0 1.02 0"
            />
          </filter>
          <filter id="softBubbleB" filterUnits="userSpaceOnUse" x="-240" y="-180" width={W + 480} height={H + 360}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={(28 + breathA * 8).toFixed(2)} />
            <feColorMatrix
              type="matrix"
              values="1.82 0 0 0 0  0 1.22 0 0 0  0 0 1.58 0 0  0 0 0 0.92 0"
            />
          </filter>
          <filter id="hotRim" filterUnits="userSpaceOnUse" x="-260" y="-200" width={W + 520} height={H + 400}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={(13 + breathA * 3).toFixed(2)} />
          </filter>
          <filter id="microShimmer" filterUnits="userSpaceOnUse" x="-260" y="-200" width={W + 520} height={H + 400}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={(2.2 + breathA * 1.2).toFixed(2)} />
          </filter>
        </defs>

        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "47% 53%",
            transform: `translate(${driftX}px, ${driftY}px) rotate(${rotation}deg) scale(${shellScale})`,
            mixBlendMode: "screen",
          }}
        >
          <ellipse
            cx="820"
            cy="510"
            rx="602"
            ry="458"
            fill="url(#cyanShell)"
            opacity={shellOpacity * 0.18}
            filter="url(#softBubbleA)"
          />
          <ellipse
            cx="846"
            cy="644"
            rx="514"
            ry="328"
            fill="url(#magentaShell)"
            opacity={(0.68 + breathB * 0.14) * 0.16}
            filter="url(#softBubbleB)"
          />
        </g>

        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "43% 48%",
            transform: `translate(${driftX * -0.35}px, ${driftY * 0.5}px) rotate(${counterRotation}deg) scale(${rimScale})`,
            mixBlendMode: "screen",
          }}
        >
          <path
            d="M 426 650 C 445 436, 572 276, 774 247 C 1014 213, 1195 336, 1233 493 C 1264 622, 1168 724, 1038 745 C 858 774, 642 748, 426 650 Z"
            fill="none"
            stroke="url(#amberArc)"
            strokeWidth="72"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={rimOpacity * 0.64}
            filter="url(#hotRim)"
          />
          <path
            d="M 520 792 C 672 892, 905 902, 1128 722 C 1242 632, 1316 498, 1264 382"
            fill="none"
            stroke="rgba(78, 229, 255, 0.38)"
            strokeWidth="92"
            strokeLinecap="round"
            opacity={(0.34 + breathA * 0.1) * 0.72}
            filter="url(#softBubbleA)"
          />
        </g>

        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "48% 56%",
            transform: `translate(${driftX * 0.5}px, ${driftY * -0.4}px) rotate(${rotation * 0.55}deg)`,
            mixBlendMode: "screen",
          }}
        >
          <ellipse
            cx="890"
            cy="600"
            rx="430"
            ry="310"
            fill="rgba(150, 114, 255, 0.08)"
            opacity={shimmerOpacity * 0.24}
            filter="url(#microShimmer)"
          />
          <circle cx="770" cy="648" r={46 + breathB * 18} fill="rgba(255, 74, 210, 0.2)" filter="url(#softBubbleB)" />
          <circle cx="956" cy="508" r={36 + breathA * 13} fill="rgba(66, 220, 255, 0.18)" filter="url(#softBubbleA)" />
          <circle cx="1076" cy="386" r={18 + breathB * 9} fill="rgba(255, 224, 142, 0.18)" filter="url(#microShimmer)" />
          <circle cx="612" cy="736" r={24 + breathA * 11} fill="rgba(255, 128, 222, 0.16)" filter="url(#microShimmer)" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}
