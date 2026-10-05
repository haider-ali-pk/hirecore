"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/* ==========================================================================
   ParticleField
   Lightweight canvas point-cloud background with three shapes:
   - ring  : hollow wavy ring (hero)
   - wave  : dotted terrain at the bottom of a section (footer / careers)
   - orbit : flat galaxy disc with a bright inner ring (final CTA)

   Performance rules built in:
   - no dependencies, plain 2D canvas, typed arrays, no per-frame allocation
   - devicePixelRatio capped at 2
   - particle count scales with container width
   - pauses when off-screen or when the tab is hidden
   - renders a single static frame when prefers-reduced-motion is set
   ========================================================================== */

export type ParticleVariant = "ring" | "wave" | "orbit";

export interface ParticleFieldProps {
  variant?: ParticleVariant;
  /** Multiplies the particle count. 1 = default. */
  density?: number;
  /** Dot colour as an "r, g, b" string. */
  color?: string;
  /** Overall brightness multiplier. */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
  /** Scale multiplier for the shape. */
  zoom?: number;
  /** Vertical shift as a fraction of container height (ring and orbit). */
  offsetY?: number;
  /** React to pointer movement. */
  interactive?: boolean;
  /** Soft-fade the edges so the effect blends into the page. */
  fade?: boolean;
  className?: string;
  style?: CSSProperties;
}

const TAU = Math.PI * 2;
const BUCKETS = 6;
const RING_LAYERS = 36;
const WAVE_ROWS = 48;
const WAVE_S_FAR = 1 / 2.5;
const RING_CAM = 3;
const ORBIT_CAM = 9;

const BASE_COUNT: Record<ParticleVariant, number> = {
  ring: 5600,
  wave: 11000,
  orbit: 7200,
};

const DOT_SIZE: Record<ParticleVariant, number> = {
  ring: 1.25,
  wave: 1.05,
  orbit: 1.0,
};

const SEEDS: Record<ParticleVariant, number> = {
  ring: 11,
  wave: 23,
  orbit: 37,
};

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;

/** Seeded RNG so the layout is identical on every resize (no flicker). */
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const bucketOf = (alpha: number) => {
  const v = (alpha * BUCKETS) | 0;
  return v < 0 ? 0 : v >= BUCKETS ? BUCKETS - 1 : v;
};

export default function ParticleField({
  variant = "ring",
  density = 1,
  color = "120, 190, 205",
  intensity = 1,
  speed = 1,
  zoom = 1,
  offsetY = 0,
  interactive = true,
  fade = true,
  className,
  style,
}: ParticleFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrapRef.current;
    const canvasEl = canvasRef.current;
    if (!wrapEl || !canvasEl) return;
    const g = canvasEl.getContext("2d");
    if (!g) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let count = 0;

    let pA = new Float32Array(0);
    let pB = new Float32Array(0);
    let pC = new Float32Array(0);
    let pD = new Float32Array(0);
    let sx = new Float32Array(0);
    let sy = new Float32Array(0);
    let ss = new Float32Array(0);
    let sb = new Uint8Array(0);

    let raf = 0;
    let running = false;
    let visible = true;
    let last = 0;
    let time = reduceMotion ? 6 : 0;
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

    /* ---------------------------------------------------------------- */
    /* Generation                                                        */
    /* ---------------------------------------------------------------- */

    const generate = (n: number) => {
      count = n;
      pA = new Float32Array(n);
      pB = new Float32Array(n);
      pC = new Float32Array(n);
      pD = new Float32Array(n);
      sx = new Float32Array(n);
      sy = new Float32Array(n);
      ss = new Float32Array(n);
      sb = new Uint8Array(n);

      const rand = mulberry32(SEEDS[variant]);

      for (let i = 0; i < n; i++) {
        pD[i] = rand() * TAU;

        if (variant === "ring") {
          pA[i] = rand() * TAU;
          pB[i] = Math.floor(rand() * RING_LAYERS);
          pC[i] = (rand() - 0.5) * 0.014;
        } else if (variant === "wave") {
          pA[i] = rand() * 2 - 1;
          pB[i] = Math.floor(rand() * WAVE_ROWS) / (WAVE_ROWS - 1);
          pC[i] = (rand() - 0.5) * 0.004;
        } else {
          const kind = rand();
          let r: number;
          if (kind < 0.09) r = 0.95 + (rand() - 0.5) * 0.03;
          else if (kind < 0.16) r = 0.02 + rand() * 0.2;
          else r = 0.22 + 1.75 * Math.pow(rand(), 1.7);
          pA[i] = r;
          pB[i] = rand() * TAU;
          pC[i] = (rand() + rand() + rand() - 1.5) * 0.05;
        }
      }
    };

    /* ---------------------------------------------------------------- */
    /* Per-frame updates (write projected positions into sx/sy/ss/sb)    */
    /* ---------------------------------------------------------------- */

    const updateRing = (t: number) => {
      const cx = width / 2;
      const cy = height * (0.5 + offsetY);
      const scale = Math.min(width, height) * 0.5 * zoom;

      const ry = mouse.x * 0.45 + Math.sin(t * 0.2) * 0.12;
      const rx = -mouse.y * 0.35;
      const cY = Math.cos(ry);
      const sY = Math.sin(ry);
      const cX = Math.cos(rx);
      const sX = Math.sin(rx);

      for (let i = 0; i < count; i++) {
        const th = pA[i] + t * 0.035;
        const layer = pB[i];
        const lf = layer / (RING_LAYERS - 1);

        const r0 = 1 + (lf - 0.5) * 0.34 + pC[i];
        const wave =
          0.045 * Math.sin(5 * th + t * 0.55 + layer * 0.32) +
          0.03 * Math.sin(9 * th - t * 0.4 + layer * 0.21) +
          0.02 * Math.sin(2 * th + t * 0.25);
        const r = r0 + wave * (0.6 + lf * 0.8);

        const x = r * Math.cos(th);
        const y = r * Math.sin(th);
        const z = 0.16 * Math.sin(3 * th + t * 0.4 + layer * 0.5) + (lf - 0.5) * 0.12;

        const x1 = x * cY + z * sY;
        const z1 = -x * sY + z * cY;
        const y2 = y * cX - z1 * sX;
        const z2 = y * sX + z1 * cX;

        const s = RING_CAM / (RING_CAM + z2);
        sx[i] = cx + x1 * scale * s;
        sy[i] = cy + y2 * scale * s;
        ss[i] = s;

        const depth = clamp(0.5 - z2 * 1.4, 0, 1);
        const tw = 0.78 + 0.22 * Math.sin(t * 1.3 + pD[i]);
        const a = (0.28 + 0.72 * depth) * tw * (0.7 + 0.3 * lf);
        sb[i] = bucketOf(a);
      }
    };

    const updateWave = (t: number) => {
      const cx = width / 2;
      const amp = height * 0.34 * zoom;

      for (let i = 0; i < count; i++) {
        const u = pB[i];
        const s = 1 / (1 + u * 1.5);
        const near = (s - WAVE_S_FAR) / (1 - WAVE_S_FAR);
        const wx = pA[i] * 2.3;

        const h =
          0.16 * Math.sin(1.3 * wx + t * 0.5 + u * 5) +
          0.1 * Math.sin(2.4 * wx - t * 0.35 + u * 9) +
          0.06 * Math.sin(5.1 * wx + t * 0.7 - u * 3);

        const baseY = height * (0.6 + 0.42 * near);
        sx[i] = cx + wx * width * 0.5 * s + mouse.x * 26 * s;
        sy[i] = baseY - h * amp * s + pC[i] * height;
        ss[i] = s;

        const crest = clamp(h * 2.2 + 0.35, 0, 1);
        const tw = 0.8 + 0.2 * Math.sin(t * 1.4 + pD[i]);
        const a = (0.18 + 0.42 * near + 0.5 * crest * (0.4 + 0.6 * near)) * tw;
        sb[i] = bucketOf(a);
      }
    };

    const orbitScale = () => Math.min(width, height * 2.4) * 0.28 * zoom;

    const updateOrbit = (t: number) => {
      const cx = width / 2;
      const cy = height * (0.5 + offsetY);
      const scale = orbitScale();

      const phi = 0.2 + mouse.y * 0.07;
      const rho = mouse.x * 0.05 - 0.03;
      const cP = Math.cos(phi);
      const sP = Math.sin(phi);
      const cR = Math.cos(rho);
      const sR = Math.sin(rho);

      for (let i = 0; i < count; i++) {
        const r = pA[i];
        const th = pB[i] + (t * 0.42) / Math.sqrt(r + 0.2);

        const x = r * Math.cos(th);
        const z = r * Math.sin(th);
        const y = pC[i] * (0.5 + r * 0.6);

        const y1 = y * cP - z * sP;
        const z1 = y * sP + z * cP;
        const x2 = x * cR - y1 * sR;
        const y2 = x * sR + y1 * cR;

        const s = ORBIT_CAM / (ORBIT_CAM + z1);
        sx[i] = cx + x2 * scale * s;
        sy[i] = cy + y2 * scale * s;
        ss[i] = s;

        const tw = 0.75 + 0.25 * Math.sin(t * 1.6 + pD[i]);
        let a: number;
        if (r < 0.22) a = 0.95 * tw;
        else if (Math.abs(r - 0.95) < 0.016) a = 0.85;
        else a = (0.16 + 0.55 * Math.exp(-r * 1.15)) * tw;
        a *= clamp(0.62 - z1 * 0.22, 0.35, 1);
        sb[i] = bucketOf(a);
      }
    };

    const update =
      variant === "ring" ? updateRing : variant === "wave" ? updateWave : updateOrbit;

    /* ---------------------------------------------------------------- */
    /* Drawing                                                           */
    /* ---------------------------------------------------------------- */

    const dotBase = DOT_SIZE[variant];

    const draw = () => {
      g.clearRect(0, 0, width, height);

      if (variant === "orbit") {
        const rad = orbitScale() * 0.5;
        g.save();
        g.translate(width / 2, height * (0.5 + offsetY));
        g.scale(1, 0.3);
        const glow = g.createRadialGradient(0, 0, 0, 0, 0, rad);
        glow.addColorStop(0, `rgba(${color}, ${clamp(0.34 * intensity, 0, 1)})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        g.globalAlpha = 1;
        g.fillStyle = glow;
        g.beginPath();
        g.arc(0, 0, rad, 0, TAU);
        g.fill();
        g.restore();
      }

      g.fillStyle = `rgb(${color})`;

      for (let b = 0; b < BUCKETS; b++) {
        g.globalAlpha = clamp(((b + 1) / BUCKETS) * intensity * 0.95, 0, 1);
        g.beginPath();
        for (let i = 0; i < count; i++) {
          if (sb[i] !== b) continue;
          const d = Math.max(0.7, dotBase * ss[i]);
          g.rect(sx[i] - d * 0.5, sy[i] - d * 0.5, d, d);
        }
        g.fill();
      }

      g.globalAlpha = 1;
    };

    /* ---------------------------------------------------------------- */
    /* Loop, sizing, observers                                           */
    /* ---------------------------------------------------------------- */

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * speed;

      const ease = Math.min(1, dt * 3.2);
      mouse.x += (mouse.tx - mouse.x) * ease;
      mouse.y += (mouse.ty - mouse.y) * ease;

      update(time);
      draw();
    };

    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const resize = () => {
      const rect = wrapEl.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target =
        Math.round((BASE_COUNT[variant] * density * clamp(width / 1440, 0.45, 1)) / 400) *
        400;
      const n = Math.max(400, target);
      if (n !== count) generate(n);

      update(time);
      draw();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      mouse.tx = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mouse.ty = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapEl);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(wrapEl);

    document.addEventListener("visibilitychange", onVisibility);
    if (interactive && !reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [variant, density, color, intensity, speed, zoom, offsetY, interactive]);

  /* Edge fade so the effect melts into the page background */
  const centerY = 50 + offsetY * 100;
  const mask = !fade
    ? undefined
    : variant === "ring"
      ? `radial-gradient(ellipse 72% 72% at 50% ${centerY}%, #000 52%, transparent 100%)`
      : variant === "orbit"
        ? `radial-gradient(ellipse 78% 62% at 50% ${centerY}%, #000 40%, transparent 100%)`
        : "linear-gradient(to bottom, transparent 0%, #000 38%, #000 100%)";

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        maskImage: mask,
        WebkitMaskImage: mask,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}