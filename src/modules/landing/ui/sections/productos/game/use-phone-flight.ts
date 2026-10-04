"use client";

import { useEffect, type RefObject } from "react";

import { PRODUCTOS_ANCHORS } from "@/modules/landing/ui/content/productos.content";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Suave en los dos extremos: arranca y aterriza sin tirones. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/** La pose del cuerpo: en el hero mira hacia arriba, saliendo de la luz; en el juego, de tres cuartos. */
const POSE = {
  hero: { rx: 24, ry: 0, rz: 0, scale: 0.86 },
  game: { rx: 6, ry: -14, rz: 1, scale: 1 },
} as const;

export interface FlightFrame {
  /** Traslado vertical del teléfono respecto de su sitio en el juego, en px. */
  ty: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  /** 0 en el hero, 1 al aterrizar. */
  t: number;
}

/**
 * Dónde está el teléfono con el scroll `s` (pura, para probarla).
 *
 * - En el hero asoma sobre la luz: su borde de arriba queda `peek` px por
 *   encima del fondo de la pantalla.
 * - Mientras el hero se va, sube MÁS DESPACIO que la página (así el titular y
 *   los botones se alejan por encima y nunca los tapa) y gira hasta su pose.
 * - Cuando el juego llega arriba (`s = land`), el teléfono está exactamente en
 *   su sitio, y desde ahí se mueve con la página.
 *
 * `slotDoc` es la posición del sitio del teléfono en el documento (en px desde
 * arriba del scroller), `land` el scroll en que el juego toca el techo y `vh`
 * el alto de la pantalla.
 */
export function flightAt(s: number, { slotDoc, land, vh, peek }: { slotDoc: number; land: number; vh: number; peek: number }): FlightFrame {
  const start = vh - peek;
  const landed = slotDoc - land;
  const t = land > 0 ? smooth(clamp01(s / land)) : 1;
  const y = s < land ? lerp(start, landed, t) : slotDoc - s;
  const ty = y - (slotDoc - s);
  return {
    ty,
    t,
    scale: lerp(POSE.hero.scale, POSE.game.scale, t),
    rx: lerp(POSE.hero.rx, POSE.game.rx, t),
    ry: lerp(POSE.hero.ry, POSE.game.ry, t),
    rz: lerp(POSE.hero.rz, POSE.game.rz, t),
  };
}

/**
 * Lleva el único teléfono de la página desde la luz del hero hasta el juego
 * (plan /productos, ajuste de la dueña del 2026-10-03: «debe ser el mismo
 * teléfono»). Solo escribe `transform` en dos elementos por frame y solo lee
 * cuando hay scroll. Con movimiento reducido no vuela: queda en su sitio.
 */
export function usePhoneFlight(slot: RefObject<HTMLElement | null>, flight: RefObject<HTMLElement | null>, body: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    const hero = document.getElementById(PRODUCTOS_ANCHORS.hero);
    const game = document.getElementById(PRODUCTOS_ANCHORS.game);
    const slotEl = slot.current;
    const flightEl = flight.current;
    const bodyEl = body.current;
    if (!scroller || !hero || !game || !slotEl || !flightEl || !bodyEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // El mismo `--pj-peek` de productos.css: min(300px, 32svh).
    const peekOf = (vh: number) => Math.min(300, vh * 0.32);

    let geo = { slotDoc: 0, land: 0, vh: 0, peek: 0 };
    const measure = () => {
      const s = scroller.scrollTop;
      const top = scroller.getBoundingClientRect().top;
      geo = {
        slotDoc: slotEl.getBoundingClientRect().top - top + s,
        land: game.getBoundingClientRect().top - top + s,
        vh: scroller.clientHeight,
        peek: peekOf(scroller.clientHeight),
      };
    };

    let frame = 0;
    let last = "";
    const paint = () => {
      frame = 0;
      const f = flightAt(scroller.scrollTop, geo);
      const move = `translate3d(0, ${f.ty.toFixed(1)}px, 0) scale(${f.scale.toFixed(4)})`;
      if (move === last) return;
      last = move;
      flightEl.style.transform = move;
      bodyEl.style.transform = `rotateX(${f.rx.toFixed(2)}deg) rotateY(${f.ry.toFixed(2)}deg) rotateZ(${f.rz.toFixed(2)}deg)`;
      if (f.t < 1) flightEl.setAttribute("data-flying", "");
      else flightEl.removeAttribute("data-flying");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onResize = () => {
      flightEl.style.transform = "";
      measure();
      last = "";
      paint();
    };

    measure();
    paint();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(hero);
    ro.observe(game);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      flightEl.removeAttribute("style");
      flightEl.removeAttribute("data-flying");
      bodyEl.removeAttribute("style");
    };
  }, [slot, flight, body]);
}
