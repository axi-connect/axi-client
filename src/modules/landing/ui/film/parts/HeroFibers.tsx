"use client";

import { useEffect, useRef } from "react";

import { FILM_CONTENT } from "@/modules/landing/domain/film/film-content";
import {
  HERO_TIMING,
  fiberPoint,
  fiberSegment,
  fiberState,
  heroFibers,
  knotOf,
  knotState,
  type HeroFiber,
  type Point,
} from "@/modules/landing/domain/film/hero-fibers";
import { FILM_NICHES } from "@/modules/landing/domain/film/niches";

/**
 * Las fibras del hero A, «Mil conversaciones, un hilo» (plan §14): cada fibra
 * es una conversación que entra por un borde y llega al nudo bajo el CTA, donde
 * se enciende la marca. La geometría es pura (`domain/film/hero-fibers`);
 * esto solo dibuja.
 *
 * Canvas 2D y nada más. Reglas de coste:
 * - Entrada por tiempo al cargar; después solo se dibuja cuando cambia el
 *   scroll del hero (evento, no bucle). Fuera de pantalla, nada.
 * - El scroll se lee en su evento; los tamaños, al cambiar de tamaño: ninguna
 *   medida del DOM por frame.
 * - DPR ≤ 2. La luz de las cabezas y el nudo son sprites pintados una vez.
 * - Con `prefers-reduced-motion`, un solo fotograma: el final.
 * - Colores de los tokens de la isla (`--foreground`, `--axi-*`), sin hex.
 */

type Rgb = [number, number, number];

const MAX_DPR = 2;
const DESKTOP = 1024;
const LABEL_EDGE = 40;

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

/** Un sprite radial (la luz de una cabeza o el nudo), pintado una vez a su tamaño máximo. */
function radialSprite(radius: number, stops: readonly [number, string][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.ceil(radius * 2);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Dos preguntas reales por nicho, del guion de la película. */
const QUESTIONS = FILM_NICHES.flatMap((n) => [FILM_CONTENT[n].ask, FILM_CONTENT[n].vault.ask]);

export function HeroFibers({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const hero = canvas.closest<HTMLElement>("[data-scene]") ?? canvas.parentElement!;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const style = getComputedStyle(canvas);
    const fg = parseColor(style.getPropertyValue("--foreground"), [237, 237, 237]);
    const brand = parseColor(style.getPropertyValue("--axi-brand"), [251, 113, 133]);
    const amber = parseColor(style.getPropertyValue("--axi-amber"), [251, 191, 36]);
    const violet = parseColor(style.getPropertyValue("--axi-violet"), [167, 139, 250]);
    const font = `12.5px ${style.getPropertyValue("--font-poppins").trim() || "Poppins"}, system-ui, sans-serif`;

    const HEAD_R = 7;
    const KNOT_R = 140;
    const head = radialSprite(HEAD_R, [
      [0, rgba(fg, 1)],
      [1, rgba(fg, 0)],
    ]);
    const knotSprite = radialSprite(KNOT_R, [
      [0, rgba(fg, 1)],
      [0.18, rgba(amber, 0.9)],
      [0.45, rgba(brand, 0.45)],
      [0.75, rgba(violet, 0.14)],
      [1, rgba(violet, 0)],
    ]);

    // W × H es el hero (la geometría); el canvas es más alto (CH) para que el
    // nudo, al bajar con la salida, no se corte en el borde del hero.
    let W = 0;
    let H = 0;
    let CH = 0;
    let dpr = 1;
    let desktop = true;
    let fibers: HeroFiber[] = [];
    let knot: Point = { x: 0, y: 0 };
    let heroHeight = 1;
    let scrollTop = scroller?.scrollTop ?? 0;
    // Si el visitante baja antes de que termine la entrada, la entrada salta a su final.
    let skipped = reduce;

    const resize = () => {
      W = Math.max(1, canvas.clientWidth);
      CH = Math.max(1, canvas.clientHeight);
      heroHeight = Math.max(1, hero.offsetHeight);
      H = heroHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(CH * dpr);
      desktop = window.innerWidth >= DESKTOP;
      const layout = { width: W, height: H, desktop };
      fibers = heroFibers(layout);
      knot = knotOf(layout);
    };

    const draw = (t: number) => {
      const s = Math.min(1, Math.max(0, scrollTop / heroHeight));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, CH);

      // Las fibras y sus preguntas viven dentro del hero (nacen fuera de su borde).
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();

      // Las fibras: solo el tramo que ya llegó y que el scroll todavía no recogió.
      ctx.lineCap = "round";
      const out = 1 - 0.6 * s;
      for (const f of fibers) {
        const st = fiberState(f, t, s);
        if (st.to - st.from < 0.002) continue;
        const q = fiberSegment(f, knot, st.from, st.to);
        ctx.beginPath();
        ctx.moveTo(q.start.x, q.start.y);
        ctx.quadraticCurveTo(q.control.x, q.control.y, q.end.x, q.end.y);
        ctx.lineWidth = f.width;
        ctx.strokeStyle = rgba(fg, f.alpha * out);
        ctx.stroke();
      }
      // La luz que viaja en la punta de cada fibra.
      ctx.globalAlpha = 0.9;
      for (const f of fibers) {
        const st = fiberState(f, t, s);
        if (!st.head) continue;
        const p = fiberPoint(f, knot, st.to);
        ctx.drawImage(head, p.x - HEAD_R, p.y - HEAD_R);
      }
      ctx.globalAlpha = 1;

      // Las preguntas, pegadas al borde de su fibra (solo en escritorio).
      if (desktop) {
        ctx.font = font;
        ctx.textBaseline = "alphabetic";
        for (const f of fibers) {
          if (f.label === null) continue;
          const a = fiberState(f, t, s).label * 0.62;
          if (a < 0.01) continue;
          const left = f.from.x < W / 2;
          ctx.textAlign = left ? "left" : "right";
          ctx.fillStyle = rgba(fg, a);
          ctx.fillText(QUESTIONS[f.label % QUESTIONS.length], left ? LABEL_EDGE : W - LABEL_EDGE, Math.min(H - 60, Math.max(130, f.from.y)) - 12);
        }
      }

      ctx.restore();

      // El nudo: el momento de color pleno del hero.
      const k = knotState(knot, t, s);
      if (k.alpha > 0.01 && k.r > 1) {
        ctx.globalAlpha = k.alpha;
        ctx.drawImage(knotSprite, k.x - k.r, k.y - k.r, k.r * 2, k.r * 2);
        ctx.globalAlpha = 1;
      }
    };

    let raf = 0;
    let visible = true;
    let start = performance.now();
    const now = () => (skipped ? HERO_TIMING.end : (performance.now() - start) / 1000);
    const loop = () => {
      raf = 0;
      const t = now();
      draw(t);
      if (t < HERO_TIMING.end && visible) raf = requestAnimationFrame(loop);
    };
    const schedule = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      scrollTop = scroller?.scrollTop ?? 0;
      if (scrollTop > 0 && !skipped) skipped = true;
      // Con movimiento reducido el fotograma final no se mueve con el scroll.
      if (!reduce) schedule();
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      resize();
      if (raf) return;
      draw(now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    io.observe(canvas);

    // Las fuentes pueden llegar después: las preguntas se repintan con Poppins.
    void document.fonts?.ready.then(() => {
      if (!raf) draw(now());
    });

    resize();
    if (scrollTop > 0) skipped = true;
    start = performance.now();
    if (reduce) draw(HERO_TIMING.end);
    else schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" data-anim="fibers" />;
}
