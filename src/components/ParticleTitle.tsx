import { useEffect, useRef, useState } from "react";

type ParticleTitleProps = {
  active: boolean;
  mobileText?: string;
  text: string;
};

type Particle = {
  alpha: number;
  delay: number;
  radius: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

const PARTICLE_DURATION = 2200;
const PARTICLE_EASE = 0.05;
const PARTICLE_FRICTION = 0.75;
const MAX_PARTICLES = 5200;

function seeded(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function textSeed(text: string) {
  return Array.from(text).reduce(
    (seed, character) => Math.imul(seed ^ character.charCodeAt(0), 16777619),
    2166136261,
  );
}

export default function ParticleTitle({ active, mobileText, text }: ParticleTitleProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mobileLayout, setMobileLayout] = useState(() =>
    window.matchMedia("(max-width: 760px)").matches,
  );
  const displayText = mobileLayout && mobileText ? mobileText : text;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateLayout = () => setMobileLayout(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    const title = titleRef.current;
    const canvas = canvasRef.current;
    if (!title || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let resizeFrame = 0;
    let generation = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clear = () => {
      window.cancelAnimationFrame(animationFrame);
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = "0";
    };

    const run = async () => {
      const currentGeneration = ++generation;
      clear();
      if (!active || reducedMotion) return;

      await document.fonts?.ready;
      if (currentGeneration !== generation || !active) return;

      const bounds = title.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      if (width < 2 || height < 2) return;

      const deviceScale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * deviceScale);
      canvas.height = Math.round(height * deviceScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const computed = window.getComputedStyle(title);
      const fontSize = Number.parseFloat(computed.fontSize);
      const parsedLineHeight = Number.parseFloat(computed.lineHeight);
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.25;
      const font = `${computed.fontWeight} ${fontSize}px ${computed.fontFamily}`;
      const alignment = computed.textAlign === "center" ? "center" : "left";
      const lines = displayText.split("\n");
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const mask = offscreen.getContext("2d", { willReadFrequently: true });
      if (!mask) return;

      mask.scale(deviceScale, deviceScale);
      mask.clearRect(0, 0, width, height);
      mask.fillStyle = "#ffffff";
      mask.font = font;
      mask.textAlign = alignment;
      mask.textBaseline = "middle";
      const textX = alignment === "center" ? width / 2 : 0;
      const textHeight = lineHeight * lines.length;
      const textTop = Math.max(0, (height - textHeight) / 2);
      lines.forEach((line, index) => {
        mask.fillText(line, textX, textTop + lineHeight * (index + 0.5));
      });

      const pixels = mask.getImageData(0, 0, offscreen.width, offscreen.height).data;
      const sampleGap = width <= 760 ? 2.75 : 3;
      const positions: Array<[number, number]> = [];
      for (let y = sampleGap / 2; y < height; y += sampleGap) {
        for (let x = sampleGap / 2; x < width; x += sampleGap) {
          const pixelX = Math.min(offscreen.width - 1, Math.round(x * deviceScale));
          const pixelY = Math.min(offscreen.height - 1, Math.round(y * deviceScale));
          if (pixels[(pixelY * offscreen.width + pixelX) * 4 + 3] > 104) {
            positions.push([x, y]);
          }
        }
      }

      const stride = Math.max(1, Math.ceil(positions.length / MAX_PARTICLES));
      const random = seeded(textSeed(displayText));
      const particles: Particle[] = [];
      for (let index = 0; index < positions.length; index += stride) {
        const [targetX, targetY] = positions[index];
        const horizontalProgress = targetX / width;
        particles.push({
          alpha: 0.56 + random() * 0.4,
          delay: 70 + horizontalProgress * 720 + random() * 150,
          radius: (width <= 760 ? 0.62 : 0.72) + random() * 0.54,
          targetX,
          targetY,
          velocityX: 0,
          velocityY: 0,
          x: targetX - width * (0.12 + random() * 0.2) - 12,
          y: targetY + (random() - 0.5) * Math.min(height * 1.15, 110),
        });
      }

      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      canvas.style.opacity = "1";
      const startTime = performance.now();

      const draw = (now: number) => {
        const elapsed = now - startTime;
        context.clearRect(0, 0, width, height);
        context.globalCompositeOperation = "lighter";

        for (const particle of particles) {
          if (elapsed < particle.delay) continue;
          const localProgress = Math.min(1, (elapsed - particle.delay) / 1150);
          particle.velocityX =
            (particle.velocityX + (particle.targetX - particle.x) * PARTICLE_EASE) *
            PARTICLE_FRICTION;
          particle.velocityY =
            (particle.velocityY + (particle.targetY - particle.y) * PARTICLE_EASE) *
            PARTICLE_FRICTION;
          particle.x += particle.velocityX;
          particle.y += particle.velocityY;

          const arrival = Math.min(1, localProgress * 1.8);
          context.beginPath();
          context.fillStyle = `rgba(225, 233, 250, ${particle.alpha * (0.28 + arrival * 0.72)})`;
          context.arc(
            particle.x,
            particle.y,
            particle.radius * (1.18 - arrival * 0.18),
            0,
            Math.PI * 2,
          );
          context.fill();
        }

        const fade = Math.max(0, Math.min(1, (PARTICLE_DURATION - elapsed) / 380));
        canvas.style.opacity = String(fade);
        if (elapsed < PARTICLE_DURATION && currentGeneration === generation) {
          animationFrame = window.requestAnimationFrame(draw);
        } else {
          clear();
        }
      };

      animationFrame = window.requestAnimationFrame(draw);
    };

    const scheduleRun = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => void run());
    };
    const observer = new ResizeObserver(scheduleRun);
    observer.observe(title);
    scheduleRun();

    return () => {
      generation += 1;
      observer.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      clear();
    };
  }, [active, displayText]);

  return (
    <h1
      aria-label={displayText.replaceAll("\n", " ")}
      className={`particleTitle ${active ? "isParticleActive" : ""}`}
      ref={titleRef}
    >
      <span aria-hidden="true" className="particleTitleMeasure">
        {displayText}
      </span>
      <canvas aria-hidden="true" className="particleTitleCanvas" ref={canvasRef} />
    </h1>
  );
}
