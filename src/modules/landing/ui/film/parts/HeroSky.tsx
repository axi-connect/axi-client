"use client";

import { useEffect, useRef } from "react";

import { SKY_FRAGMENTS } from "@/modules/landing/domain/film/film-content";

/**
 * Las conversaciones que flotan en el hero: fragmentos de mensajes reales del
 * producto en matriz de puntos, que suben despacio sobre el gradiente de marca
 * (`BrandGradientCanvas`, el fondo «con vida» del hero original, que la dueña
 * pidió conservar el 2026-09-30). Tres profundidades: las cercanas son más
 * grandes, más nítidas y suben más rápido, también con el scroll.
 *
 * Canvas 2D transparente y nada más. Reglas de coste:
 * - 30 fps como techo y densidad de píxel ≤ 1,5.
 * - Se detiene fuera de pantalla (IntersectionObserver) y con la pestaña oculta.
 * - Con `prefers-reduced-motion` pinta un solo fotograma y no se anima.
 * - Los colores salen de los tokens (`--axi-*` bajo `.dark`), no de hex.
 * - Los fragmentos se rasterizan una vez como sprites de puntos; cada frame
 *   solo los desplaza.
 */

type Rgb = [number, number, number];
type Sprite = { canvas: HTMLCanvasElement; w: number; h: number };
type Particle = { sprite: Sprite; x: number; y: number; speed: number; alpha: number; depth: number; tint: number };

const DOT = 2.1; // separación de la matriz, px CSS
const MAX_DPR = 1.5;
const FRAME_MS = 1000 / 30;

function parseColor(value: string, fallback: Rgb): Rgb {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(/[ ,]+/).map(Number);
    return [r, g, b];
  }
  return fallback;
}

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`;

/** Un fragmento de texto convertido en matriz de puntos, dibujado una vez. */
function makeSprite(text: string): Sprite {
  const probe = document.createElement("canvas");
  const pctx = probe.getContext("2d")!;
  pctx.font = "600 9px Poppins, system-ui, sans-serif";
  const cols = Math.ceil(pctx.measureText(text).width) + 2;
  const rows = 12;
  probe.width = cols;
  probe.height = rows;
  pctx.font = "600 9px Poppins, system-ui, sans-serif";
  pctx.fillStyle = "#fff";
  pctx.textBaseline = "middle";
  pctx.fillText(text, 1, rows / 2 + 0.5);
  const data = pctx.getImageData(0, 0, cols, rows).data;

  const out = document.createElement("canvas");
  out.width = Math.ceil(cols * DOT);
  out.height = Math.ceil(rows * DOT);
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#fff";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = data[(y * cols + x) * 4 + 3];
      if (a < 90) continue;
      octx.globalAlpha = Math.min(1, a / 200);
      octx.beginPath();
      octx.arc(x * DOT + DOT / 2, y * DOT + DOT / 2, DOT * 0.36, 0, Math.PI * 2);
      octx.fill();
    }
  }
  return { canvas: out, w: out.width, h: out.height };
}

/** El sprite blanco teñido con un color de marca; uno por par sprite–color. */
const tints = new WeakMap<Sprite, Map<string, HTMLCanvasElement>>();
function tinted(sprite: Sprite, rgb: Rgb): HTMLCanvasElement {
  const key = rgb.join(",");
  let byColor = tints.get(sprite);
  if (!byColor) tints.set(sprite, (byColor = new Map()));
  let out = byColor.get(key);
  if (!out) {
    out = document.createElement("canvas");
    out.width = sprite.w;
    out.height = sprite.h;
    const octx = out.getContext("2d")!;
    octx.drawImage(sprite.canvas, 0, 0);
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = rgba(rgb, 1);
    octx.fillRect(0, 0, sprite.w, sprite.h);
    byColor.set(key, out);
  }
  return out;
}

/** Escala, velocidad y brillo por profundidad (0 = al fondo, 2 = cerca). */
const DEPTHS = [
  { scale: 0.78, speed: 0.7, alpha: 0.4, scroll: 0.25 },
  { scale: 1, speed: 1, alpha: 0.62, scroll: 0.45 },
  { scale: 1.25, speed: 1.35, alpha: 0.85, scroll: 0.7 },
] as const;

export function HeroSky({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    const style = getComputedStyle(canvas);
    const color = {
      fg: parseColor(style.getPropertyValue("--foreground"), [250, 250, 250]),
      brand: parseColor(style.getPropertyValue("--axi-brand"), [251, 113, 133]),
      amber: parseColor(style.getPropertyValue("--axi-amber"), [251, 191, 36]),
      violet: parseColor(style.getPropertyValue("--axi-violet"), [167, 139, 250]),
    };

    let W = 0;
    let H = 0;
    let dpr = 1;
    let sprites: Sprite[] = [];
    let particles: Particle[] = [];
    let pointer = 0;
    let pointerTarget = 0;

    // Las fuentes pueden no estar listas en el primer frame: los sprites se
    // rehacen cuando llegan, para que la matriz use Poppins y no un respaldo.
    const buildSprites = () => {
      sprites = SKY_FRAGMENTS.map(makeSprite);
      particles = particles.map((p, i) => ({ ...p, sprite: sprites[i % sprites.length] }));
    };

    // Siembra determinista y repartida: cada mensaje en su franja horizontal,
    // para que el cielo se vea poblado sin montones ni huecos.
    const seed = () => {
      let s = 11;
      const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
      const count = W < 640 ? 14 : 30;
      particles = Array.from({ length: count }, (_, i) => ({
        sprite: sprites[i % sprites.length],
        x: (i + 0.2 + rnd() * 0.6) / count,
        y: rnd(),
        speed: 0.012 + rnd() * 0.018,
        alpha: 0.75 + rnd() * 0.25,
        depth: i % 3,
        tint: rnd(),
      }));
      // Mezcla el orden de columnas para que la profundidad no forme bandas.
      for (let i = particles.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [particles[i].x, particles[j].x] = [particles[j].x, particles[i].x];
      }
      // De atrás adelante: las cercanas se pintan encima.
      particles.sort((p, q) => p.depth - q.depth);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const wasNarrow = W < 640;
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (!particles.length || wasNarrow !== W < 640) seed();
    };

    const tintOf = (t: number) => (t < 0.12 ? color.brand : t < 0.2 ? color.violet : t < 0.26 ? color.amber : color.fg);

    const draw = (t: number, scroll: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const d = DEPTHS[p.depth];
        const w = p.sprite.w * d.scale;
        const h = p.sprite.h * d.scale;
        // Suben de abajo arriba; el scroll las empuja según su profundidad.
        const y = 1 - ((p.y + t * p.speed * d.speed * 0.72 + scroll * d.scroll) % 1); // 1 → 0
        const py = y * (H + h * 2) - h;
        const fade = Math.min(1, y * 4) * Math.min(1, (1 - y) * 4);
        if (fade <= 0.02) continue;
        const px = p.x * (W + w * 0.4) - w * 0.7 + pointer * (6 + p.depth * 8);
        // Detrás del titular el cielo se calla: los mensajes se apagan en la
        // columna central para no competir con el texto.
        const cx = Math.abs(px + w / 2 - W / 2) / (W / 2);
        const cy = Math.abs(py - H * 0.46) / (H * 0.3);
        const quiet = cx < 0.55 && cy < 1 ? 0.12 + 0.88 * Math.max(cx / 0.55, cy) ** 2 : 1;
        ctx.globalAlpha = p.alpha * d.alpha * fade * quiet;
        ctx.drawImage(tinted(p.sprite, tintOf(p.tint)), px, py, w, h);
      }
      ctx.globalAlpha = 1;
    };

    const scrollProgress = () => {
      if (!scroller) return 0;
      return Math.min(1, Math.max(0, scroller.scrollTop / Math.max(1, H)));
    };

    buildSprites();
    resize();
    void document.fonts?.ready.then(() => {
      buildSprites();
      if (reduce) draw(40, scrollProgress());
    });

    let raf = 0;
    let last = 0;
    let visible = true;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      pointer += (pointerTarget - pointer) * 0.06;
      draw((now - start) / 1000, scrollProgress());
    };
    const play = () => {
      if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => {
      resize();
      draw(reduce ? 40 : (performance.now() - start) / 1000, scrollProgress());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);
    const onPointer = (e: PointerEvent) => {
      pointerTarget = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    draw(reduce ? 40 : 0, scrollProgress());
    play();

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" data-anim="sky" />;
}
