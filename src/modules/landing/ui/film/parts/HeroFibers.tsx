"use client";

import { useEffect, useRef } from "react";

import { FILM_CONTENT } from "@/modules/landing/domain/film/film-content";
import {
  HERO_TIMING,
  assignLabels,
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
 * - DPR ≤ 2. La luz de las cabezas es un sprite pintado una vez; las preguntas,
 *   sprites pintados al cambiar de tamaño (sin `fillText` por frame).
 * - El nudo no va en el canvas: es una capa CSS (`.film-hero-knot`) que solo
 *   cambia `transform` y `opacity`, fuera de la máscara que apaga las fibras
 *   sobre las cifras.
 * - Con `prefers-reduced-motion`, un solo fotograma: el final.
 * - Colores de los tokens de la isla (`--foreground`; el nudo, `--axi-*` en CSS), sin hex.
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

type TextSprite = { image: HTMLCanvasElement; width: number; ascent: number };

/** Margen del sprite de texto alrededor de su caja (antialias y rasgos que sobresalen). */
const SPRITE_PAD = 2;

/**
 * Un texto pintado una vez, a `dpr`, en un canvas desconectado: el canvas del
 * hero solo lo copia (`drawImage`), y la opacidad va en `globalAlpha`. `ctx`
 * (con `font` ya puesta) solo mide.
 */
function textSprite(ctx: CanvasRenderingContext2D, text: string, font: string, color: string, dpr: number): TextSprite {
  const m = ctx.measureText(text);
  const ascent = Math.ceil(m.actualBoundingBoxAscent || 10) + SPRITE_PAD;
  const descent = Math.ceil(m.actualBoundingBoxDescent || 4) + SPRITE_PAD;
  const image = document.createElement("canvas");
  image.width = Math.ceil((m.width + SPRITE_PAD * 2) * dpr);
  image.height = Math.ceil((ascent + descent) * dpr);
  const g = image.getContext("2d");
  if (g) {
    g.scale(dpr, dpr);
    g.font = font;
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    g.fillStyle = color;
    g.fillText(text, SPRITE_PAD, ascent);
  }
  return { image, width: m.width, ascent };
}

/** Al píxel del dispositivo: el sprite se copia 1:1, sin emborronar el texto. */
const snap = (v: number, dpr: number) => Math.round(v * dpr) / dpr;

/** Dos preguntas reales por nicho, del guion de la película. */
const QUESTIONS = FILM_NICHES.flatMap((n) => [FILM_CONTENT[n].ask, FILM_CONTENT[n].vault.ask]);

/** Posición de `el` dentro de `root` por la cadena de `offsetParent` (sin transformaciones: no la mueve la entrada CSS). */
function offsetWithin(el: HTMLElement, root: HTMLElement): { top: number; left: number } {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left };
}

type Box = { left: number; top: number; right: number; bottom: number };

export function HeroFibers({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const knotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const knotEl = knotRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !knotEl || !ctx) return;
    const hero = canvas.closest<HTMLElement>("[data-scene]") ?? canvas.parentElement!;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const style = getComputedStyle(canvas);
    const fg = parseColor(style.getPropertyValue("--foreground"), [237, 237, 237]);
    const font = `12.5px ${style.getPropertyValue("--font-poppins").trim() || "Poppins"}, system-ui, sans-serif`;

    const HEAD_R = 7;
    const KNOT_R = 140;
    const head = radialSprite(HEAD_R, [
      [0, rgba(fg, 1)],
      [1, rgba(fg, 0)],
    ]);

    let W = 0;
    let H = 0;
    let dpr = 1;
    let desktop = true;
    let fibers: HeroFiber[] = [];
    let knot: Point = { x: 0, y: 0 };
    let labels = new Map<number, number>();
    // Cada pregunta, pintada una vez por tamaño (ver `textSprite`).
    let sprites: TextSprite[] = [];
    let heroHeight = 1;
    let scrollTop = scroller?.scrollTop ?? 0;
    // Si el visitante baja antes de que termine la entrada, la entrada salta a su final.
    let skipped = reduce;

    /** El titular como caja de texto (no de bloque), en px del hero: las preguntas no lo tocan. */
    const headlineBox = (): Box | null => {
      const h1 = hero.querySelector("h1");
      if (!h1) return null;
      const range = document.createRange();
      range.selectNodeContents(h1);
      const heroRect = hero.getBoundingClientRect();
      const rects = Array.from(range.getClientRects());
      if (!rects.length) return null;
      const pad = 16;
      return {
        left: Math.min(...rects.map((r) => r.left)) - heroRect.left - pad,
        right: Math.max(...rects.map((r) => r.right)) - heroRect.left + pad,
        top: Math.min(...rects.map((r) => r.top)) - heroRect.top - pad,
        bottom: Math.max(...rects.map((r) => r.bottom)) - heroRect.top + pad,
      };
    };

    // Todo lo que depende del layout se mide aquí, al cambiar de tamaño (y al
    // llegar las fuentes), nunca por frame.
    const resize = () => {
      W = Math.max(1, canvas.clientWidth);
      H = Math.max(1, canvas.clientHeight);
      heroHeight = Math.max(1, hero.offsetHeight);
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      desktop = window.innerWidth >= DESKTOP;

      // El nudo: bajo «Sin tarjeta…» (+48 px) y por encima de las cifras (−60 px).
      const fine = hero.querySelector<HTMLElement>("[data-hero-fine]");
      const stats = hero.querySelector<HTMLElement>("[data-anim=stats]");
      const layout = {
        width: W,
        height: H,
        desktop,
        knotMin: fine ? offsetWithin(fine, hero).top + fine.offsetHeight + 48 : undefined,
        knotMax: stats ? offsetWithin(stats, hero).top - 60 : undefined,
      };
      fibers = heroFibers(layout);
      knot = knotOf(layout);
      hero.style.setProperty("--knot-y", `${knot.y}px`);

      // Las preguntas: un hueco fijo por lado, fuera del titular.
      labels = new Map();
      if (desktop) {
        ctx.font = font;
        const box = headlineBox();
        sprites = QUESTIONS.map((q) => textSprite(ctx, q, font, rgba(fg, 1), dpr));
        const widest = Math.max(...sprites.map((sp) => sp.width));
        labels = assignLabels(fibers, layout, (side, y) => {
          if (!box) return true;
          const left = side === "left" ? LABEL_EDGE : W - LABEL_EDGE - widest;
          const right = left + widest;
          const top = y - 12 - 14;
          const bottom = y - 12 + 4;
          return right < box.left || left > box.right || bottom < box.top || top > box.bottom;
        });
      }
    };

    const draw = (t: number) => {
      const s = Math.min(1, Math.max(0, scrollTop / heroHeight));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Las fibras: solo el tramo que ya llegó y que el scroll todavía no recogió.
      ctx.lineCap = "round";
      // Con la gota relevando al nudo (§25), las fibras ya no tienen dónde
      // recogerse: se apagan en el primer 12 % (la gota aún tapa su punto).
      const relay = hero.hasAttribute("data-relay");
      const out = (1 - 0.6 * s) * (relay ? Math.max(0, 1 - s / 0.12) : 1);
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
      // La luz en la punta que se mueve: la que llega y, al salir, la que se recoge.
      // Con la gota del video ya relevando al nudo (§25, `data-relay`), las
      // puntas se recogerían en un sitio donde ya no hay luz: no se pintan.
      ctx.globalAlpha = relay ? 0 : 0.9;
      for (const f of fibers) {
        if (!ctx.globalAlpha) break;
        const st = fiberState(f, t, s);
        if (st.head === null) continue;
        const p = fiberPoint(f, knot, st.head);
        ctx.drawImage(head, p.x - HEAD_R, p.y - HEAD_R);
      }
      ctx.globalAlpha = 1;

      // Las preguntas, pegadas al borde de su fibra (solo en escritorio).
      // Sprites y no `fillText`: con texto, el canvas conectado recalculaba los
      // estilos de la página en cada frame de scroll (gsap los deja sucios),
      // 263 ms en el arranque con CPU ×1 (2-cinematic, 2026-10-01).
      if (desktop) {
        for (const [i, y] of labels) {
          const f = fibers[i];
          const a = fiberState(f, t, s).label * 0.62;
          const sp = f.label === null ? undefined : sprites[f.label % sprites.length];
          if (a < 0.01 || !sp) continue;
          const x = f.from.x < W / 2 ? LABEL_EDGE : W - LABEL_EDGE - sp.width;
          ctx.globalAlpha = a;
          ctx.drawImage(sp.image, snap(x - SPRITE_PAD, dpr), snap(y - 12 - sp.ascent, dpr), sp.image.width / dpr, sp.image.height / dpr);
        }
        ctx.globalAlpha = 1;
      }


      // El nudo: el momento de color pleno del hero. Capa CSS: solo transform y opacity.
      const k = knotState(knot, t, s);
      // Por debajo de 1024 la luz del video es el filamento (§25.4, empieza con
      // la escena a «top 80 %»): el nudo baja un poco y se apaga antes, para
      // que nunca se vean las dos luces a la vez.
      if (!desktop) {
        const f = Math.min(1, Math.max(0, (s - 0.08) / 0.14));
        k.alpha *= 1 - f;
        k.y += 40 * f;
      }
      knotEl.style.transform = `translate3d(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px, 0) scale(${(k.r / KNOT_R).toFixed(4)})`;
      knotEl.style.opacity = k.alpha.toFixed(3);
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

    // Las fuentes pueden llegar después: cambian el titular y el texto (el nudo
    // y los huecos se vuelven a medir) y las preguntas se repintan con Poppins.
    void document.fonts?.ready.then(() => {
      resize();
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

  return (
    <>
      <canvas ref={ref} className={className} aria-hidden="true" data-anim="fibers" />
      <div ref={knotRef} className="film-hero-knot" aria-hidden="true" />
    </>
  );
}
