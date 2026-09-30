"use client";

import { useEffect, useRef } from "react";

import { SKY_FRAGMENTS } from "@/modules/landing/domain/film/film-content";

/**
 * El fondo del hero: un atardecer de dunas con grano y un cielo del que suben
 * fragmentos de conversaciones en matriz de puntos (la referencia aprobada
 * el 2026-09-30, rehecha con la marca: sin video de terceros y sin cifras
 * inventadas). Las crestas de las tres dunas brillan en coral, ámbar y violeta:
 * son el nacimiento de la cinta de luz que guía la película.
 *
 * Canvas 2D y nada más (≈ 5 kB). Reglas de coste, porque es lo único que se
 * mueve solo en toda la home:
 * - 30 fps como techo y densidad de píxel ≤ 1,5.
 * - Se detiene fuera de pantalla (IntersectionObserver) y con la pestaña oculta.
 * - Con `prefers-reduced-motion` pinta un solo fotograma y no se anima.
 * - Los colores salen de los tokens (`--axi-*` bajo `.dark`), no de hex.
 * - Los fragmentos se rasterizan una vez como sprites de puntos; cada frame
 *   solo los desplaza.
 */

type Rgb = [number, number, number];
type Sprite = { canvas: HTMLCanvasElement; w: number; h: number };
type Particle = { sprite: Sprite; x: number; y: number; speed: number; alpha: number; tint: number };

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

/** Grano estático: una textura de ruido que se repite sobre las dunas. */
function makeGrain(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(160, 160);
  let s = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const v = (s / 2147483647) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 34;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Las tres dunas: base (fracción del alto), amplitudes y fases de su cresta. */
const DUNES = [
  { base: 0.66, amp: [0.055, 0.02], freq: [1.1, 2.7], speed: [0.05, 0.08], phase: 0.4, rim: "violet" as const, parallax: 8 },
  { base: 0.76, amp: [0.05, 0.025], freq: [1.6, 3.4], speed: [-0.06, 0.07], phase: 2.1, rim: "amber" as const, parallax: 14 },
  { base: 0.86, amp: [0.045, 0.018], freq: [1.3, 3.9], speed: [0.07, -0.05], phase: 4.2, rim: "brand" as const, parallax: 22 },
];

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
      bg: parseColor(style.getPropertyValue("--background"), [10, 10, 10]),
      brand: parseColor(style.getPropertyValue("--axi-brand"), [251, 113, 133]),
      amber: parseColor(style.getPropertyValue("--axi-amber"), [251, 191, 36]),
      violet: parseColor(style.getPropertyValue("--axi-violet"), [167, 139, 250]),
    };

    let W = 0;
    let H = 0;
    let dpr = 1;
    const grain = makeGrain();
    const grainPattern = ctx.createPattern(grain, "repeat");
    let sprites: Sprite[] = [];
    let particles: Particle[] = [];
    let pointer = 0;
    let pointerTarget = 0;

    // Las fuentes pueden no estar listas en el primer frame: los sprites se
    // rehacen cuando llegan, para que la matriz use Poppins y no un respaldo.
    const buildSprites = () => {
      sprites = SKY_FRAGMENTS.map(makeSprite);
      particles = particles.length ? particles.map((p, i) => ({ ...p, sprite: sprites[i % sprites.length] })) : [];
    };

    const seed = () => {
      let s = 11;
      const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
      const count = W < 640 ? 9 : 16;
      particles = Array.from({ length: count }, (_, i) => ({
        sprite: sprites[i % sprites.length],
        x: rnd(),
        y: rnd(),
        speed: 0.012 + rnd() * 0.02,
        alpha: 0.28 + rnd() * 0.4,
        tint: rnd(),
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (!particles.length) seed();
    };

    const crest = (d: (typeof DUNES)[number], x: number, t: number, lift: number) =>
      H * (d.base + lift) +
      H * d.amp[0] * Math.sin((x / W) * Math.PI * d.freq[0] + t * d.speed[0] + d.phase) +
      H * d.amp[1] * Math.sin((x / W) * Math.PI * d.freq[1] + t * d.speed[1] + d.phase * 1.7);

    const draw = (t: number, scroll: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const horizon = H * 0.64;

      // Cielo: noche violeta arriba, brillo rosa y ámbar en el horizonte.
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, rgba(color.bg, 1));
      sky.addColorStop(0.45, rgba(color.violet, 0.16));
      sky.addColorStop(0.8, rgba(color.brand, 0.3));
      sky.addColorStop(1, rgba(color.amber, 0.3));
      // Por debajo del horizonte el gradiente se sostiene hasta que lo tapan las dunas.
      ctx.fillStyle = rgba(color.bg, 1);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W / 2, horizon, 0, W / 2, horizon, Math.max(W, H) * 0.55);
      glow.addColorStop(0, rgba([255, 244, 240], 0.42 * (1 - scroll * 0.6)));
      glow.addColorStop(0.35, rgba(color.brand, 0.14));
      glow.addColorStop(1, rgba(color.brand, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Conversaciones que suben desde el horizonte y se apagan arriba.
      const drift = t * 0.018 + scroll * 0.35;
      for (const p of particles) {
        const y = 1 - ((p.y + drift * p.speed * 40) % 1); // 1 → 0
        const py = y * horizon * 0.98;
        const fade = Math.min(1, y * 3) * Math.min(1, (1 - y) * 4);
        if (fade <= 0.02) continue;
        const px = p.x * (W + p.sprite.w) - p.sprite.w + pointer * 10;
        // Detrás del titular el cielo se calla: los mensajes se apagan en la
        // columna central para no competir con el texto.
        const cx = Math.abs(px + p.sprite.w / 2 - W / 2) / (W / 2);
        const cy = Math.abs(py - H * 0.42) / (H * 0.3);
        const quiet = cx < 0.55 && cy < 1 ? 0.18 + 0.82 * Math.max(cx / 0.55, cy) ** 2 : 1;
        ctx.globalAlpha = p.alpha * fade * 0.8 * quiet;
        ctx.drawImage(p.sprite.canvas, px, py - p.sprite.h / 2, p.sprite.w, p.sprite.h);
      }
      ctx.globalAlpha = 1;

      // Las dunas, de atrás adelante; al bajar, se hunden un poco (parallax).
      DUNES.forEach((d, i) => {
        const lift = scroll * (0.05 + i * 0.05);
        const shift = pointer * d.parallax;
        const step = Math.max(6, W / 120);
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, crest(d, x + shift, t, lift));
        ctx.lineTo(W, H);
        ctx.closePath();
        const top = H * (d.base + lift - d.amp[0] - d.amp[1]);
        // El cuerpo de la duna, iluminado desde el horizonte: la luz entra por
        // la cresta y se apaga hacia abajo (la referencia: arena rosada al atardecer).
        const body = ctx.createLinearGradient(0, top, 0, top + H * 0.42);
        const rim = color[d.rim];
        body.addColorStop(0, rgba(rim, d.rim === "amber" ? 0.34 : 0.44));
        body.addColorStop(0.12, rgba(rim, d.rim === "amber" ? 0.16 : 0.24));
        body.addColorStop(0.4, rgba(color.brand, 0.08));
        body.addColorStop(0.75, rgba(color.bg, 0.97));
        body.addColorStop(1, rgba(color.bg, 1));
        ctx.fillStyle = body;
        ctx.fill();

        // La cresta encendida: el origen de la cinta de ese color.
        ctx.beginPath();
        for (let x = 0; x <= W + step; x += step) {
          const y = crest(d, x + shift, t, lift);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(rim, 0.22);
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = rgba(rim, 0.8);
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      // Grano sobre las dunas y fundido a negro abajo, para empalmar con la escena siguiente.
      if (grainPattern) {
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, horizon - H * 0.12, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
      // Fundido largo y con curva: el hero no termina en un borde, se apaga.
      const floor = ctx.createLinearGradient(0, H * 0.66, 0, H);
      floor.addColorStop(0, rgba(color.bg, 0));
      floor.addColorStop(0.55, rgba(color.bg, 0.55));
      floor.addColorStop(0.85, rgba(color.bg, 0.92));
      floor.addColorStop(1, rgba(color.bg, 1));
      ctx.fillStyle = floor;
      ctx.fillRect(0, H * 0.66, W, H * 0.34);
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
