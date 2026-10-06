"use client";

import { useEffect, type RefObject } from "react";

import { PRODUCTOS_ANCHORS } from "@/modules/landing/ui/content/productos.content";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Suave en los dos extremos: arranca y aterriza sin tirones. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * La pose del cuerpo. En el hero mira hacia arriba, saliendo de la luz; en el
 * juego queda DE FRENTE, para que el chat se lea (plan productos_tinta §4.2).
 * A mitad de vuelo gira `swing` grados en Y y vuelve: así se ve que es un
 * objeto, no una imagen que sube.
 */
const POSE = {
  hero: { rx: 22, scale: 1.14 },
  game: { rx: 0, scale: 1 },
  swing: -12,
  /** El asentamiento al llegar: un grado de más en X que se recoge. */
  settle: 1.2,
} as const;

export interface FlightFrame {
  /** Traslado vertical del teléfono respecto de su sitio en el juego, en px. */
  ty: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  /** 0 en el hero, 1 al aterrizar (suavizado). */
  t: number;
  /** El progreso crudo del vuelo, 0–1 (para la coreografía). */
  raw: number;
  /** La pantalla: 0 apagada, 1 encendida. Se enciende al despegar. */
  screen: number;
  /** Las columnas del juego: entran solo al final del vuelo. */
  rails: number;
  /** Dónde va el brillo del cristal, de −1 (fuera a la izquierda) a 1. */
  sheen: number;
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
  const raw = land > 0 ? clamp01(s / land) : 1;
  const t = smooth(raw);
  const y = s < land ? lerp(start, landed, t) : slotDoc - s;
  const ty = y - (slotDoc - s);
  const settle = raw > 0.88 && raw < 1 ? Math.sin(((raw - 0.88) / 0.12) * Math.PI) * POSE.settle : 0;
  return {
    ty,
    t,
    raw,
    scale: lerp(POSE.hero.scale, POSE.game.scale, t),
    rx: lerp(POSE.hero.rx, POSE.game.rx, t) + settle,
    ry: Math.sin(raw * Math.PI) * POSE.swing,
    rz: 0,
    screen: clamp01((raw - 0.1) / 0.3),
    rails: clamp01((raw - 0.82) / 0.18),
    sheen: lerp(-1, 1, raw),
  };
}

/**
 * Lleva el único teléfono de la página desde la luz del hero hasta el juego
 * (pedido de la dueña: «debe ser el mismo teléfono»), con la coreografía del
 * tablero Vuelo del lienzo en tinta. Solo escribe `transform` y `opacity`, en
 * línea, sin variables CSS por frame, y solo lee cuando hay scroll. Con
 * movimiento reducido no vuela: todo queda quieto y a la vista.
 *
 * La escena del juego lleva `data-await` mientras el teléfono no ha llegado y
 * `data-landed` cuando llega: con eso el CSS deja el saludo de Vera para el
 * aterrizaje. Sin JS no hay ninguno de los dos y el saludo está desde el inicio.
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

    const offEl = slotEl.querySelector<HTMLElement>(".pj-ph-off");
    const sheenEl = slotEl.querySelector<HTMLElement>(".pj-ph-sheen");
    const floorEl = slotEl.querySelector<HTMLElement>(".pj-ph-floor");
    // Las columnas solo se coreografían en escritorio: en móvil van debajo del teléfono.
    const wide = window.matchMedia("(min-width: 1024px)");
    const rails = Array.from(game.querySelectorAll<HTMLElement>("[data-rail]"));

    // El mismo `--pj-peek` de productos.css: min(260px, 26svh).
    const peekOf = (vh: number) => Math.min(260, vh * 0.26);

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
    let landed = false;
    const paint = () => {
      frame = 0;
      const f = flightAt(scroller.scrollTop, geo);
      const move = `translate3d(0, ${f.ty.toFixed(1)}px, 0) scale(${f.scale.toFixed(4)})`;
      const pose = `rotateX(${f.rx.toFixed(2)}deg) rotateY(${f.ry.toFixed(2)}deg)`;
      if (move + pose === last) return;
      last = move + pose;
      flightEl.style.transform = move;
      bodyEl.style.transform = pose;
      if (offEl) offEl.style.opacity = (1 - f.screen).toFixed(3);
      if (sheenEl) sheenEl.style.transform = `translate3d(${(f.sheen * 120).toFixed(1)}%, 0, 0)`;
      if (floorEl) floorEl.style.opacity = f.t.toFixed(3);
      const r = wide.matches ? f.rails : 1;
      rails.forEach((el) => {
        if (r >= 1) {
          el.style.removeProperty("opacity");
          el.style.removeProperty("transform");
          return;
        }
        el.style.opacity = r.toFixed(3);
        el.style.transform = `translate3d(${((el.dataset.rail === "l" ? -48 : 48) * (1 - r)).toFixed(1)}px, 0, 0)`;
      });
      if (f.t < 1) flightEl.setAttribute("data-flying", "");
      else flightEl.removeAttribute("data-flying");
      // El saludo llega una vez, al primer aterrizaje.
      if (!landed && f.raw >= 0.98) {
        landed = true;
        game.setAttribute("data-landed", "");
      }
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

    game.setAttribute("data-await", "");
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
      offEl?.style.removeProperty("opacity");
      sheenEl?.style.removeProperty("transform");
      floorEl?.style.removeProperty("opacity");
      rails.forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
      });
      game.removeAttribute("data-await");
      game.removeAttribute("data-landed");
    };
  }, [slot, flight, body]);
}
