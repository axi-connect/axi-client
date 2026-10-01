/**
 * «Vendemos progreso» en el motor (plan §18): en escritorio la escena se fija y
 * el scroll vertical mueve la pista horizontal. Tiempos (`p` de 0 a 1):
 *
 * - 0–0,03 quieto · 0,03–0,14 el isotipo se desarma (solo translate) ·
 *   0,14–0,2 pausa con «Tres piezas · un solo sistema».
 * - 0,2–1 la pista, por tramos: de la intro al pilar 1, una meseta de lectura
 *   con el pilar centrado, del 1 al 2, meseta, del 2 al 3, meseta. Entre pilares
 *   el tramo va con ease in-out: cada pilar se lee quieto, como una diapositiva,
 *   y el parallax ocurre en las transiciones (QA del 2026-10-01).
 *
 * Todas las capas salen de UN valor (`move`, px recorridos) en un solo pintado:
 * pista 1x, isotipo de la intro 0,8x (se apaga al salir), piezas 1,22x con la
 * separación respecto a su sitio acotada a ±120 px, palabras con una deriva
 * suave dentro de su columna y la barra de cada pilar. Solo transform y opacity.
 * En móvil no hay nada que hacer: las tarjetas son scroll-snap nativo.
 */
import { gsap } from "gsap";

import { PHILOSOPHY_TRACK, PHILOSOPHY_TRACK_FROM as TRACK_FROM, philosophyMove, philosophyTravel } from "@/modules/landing/domain/film/philosophy-content";
import { atP, counter, num, showIn, spanTimeline, visible, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

/** La pieza no se aparta de su sitio más que esto (px). */
const PIECE_SLACK = 120;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const philosophy: Scene = (section, ctx) => {
  if (!ctx.desktop) return;
  const tl = spanTimeline(section, ctx, 420);

  // 0,03–0,14: el desarme, cada cinta por su dirección natural. 0,14–0,2: pausa.
  for (const el of visible(section, "[data-anim=philo-split]")) {
    tl.fromTo(el, { x: 0, y: 0 }, { x: num(el, "dx"), y: num(el, "dy"), ease: "power3.out", duration: atP(0.11) }, atP(0.03));
  }
  showIn(tl, visible(section, "[data-anim=philo-split-caption]"), 0.12, 0.18, 6);

  const quick = (el: Element, prop: string, unit?: string) => gsap.quickSetter(el, prop, unit);
  const track = visible(section, "[data-anim=philo-track]").map((el) => quick(el, "x", "px"));
  const mark = visible(section, "[data-anim=philo-mark]").map((el) => ({ x: quick(el, "x", "px"), o: quick(el, "opacity") }));
  const pieces = visible(section, "[data-anim=philo-piece]").map((el) => ({ i: num(el, "index"), x: quick(el, "x", "px"), o: quick(el, "opacity") }));
  const words = visible(section, "[data-anim=philo-word]").map((el) => ({ i: num(el, "index"), x: quick(el, "x", "px"), o: quick(el, "opacity") }));
  const bars = visible(section, "[data-anim=philo-bar]").map((el) => quick(el, "scaleX"));
  const copies = visible(section, "[data-anim=philo-copy]").map((el) => ({ el, i: num(el, "index"), o: quick(el, "opacity"), off: false }));
  // Un pilar que no está en cuadro sale del teclado y del lector (`inert`): su
  // «Ver «…»» recibía el foco con opacidad 0 y fuera de pantalla (auditoría, M2).
  const offstage = (c: (typeof copies)[number], off: boolean) => {
    if (c.off === off) return;
    c.off = off;
    c.el.toggleAttribute("inert", off);
  };
  gsap.context()?.add(() => () => copies.forEach((c) => c.el.removeAttribute("inert")));
  const intro = visible(section, "[data-anim=philo-intro-copy]").map((el) => quick(el, "opacity"));
  const half = PHILOSOPHY_TRACK.pillar / 2;

  // Dónde está centrado cada pilar (px de pista); se mide con la ventana.
  const stops = () => {
    const vw = window.innerWidth;
    const n = pieces.length || 3;
    const travel = philosophyTravel(vw, n);
    return Array.from({ length: n }, (_, i) => travel - (n - 1 - i) * PHILOSOPHY_TRACK.pillar);
  };
  // Se recalculan solo si cambia el ancho (leer innerWidth no fuerza layout).
  let centers = stops();
  let width = window.innerWidth;

  const paint = (v: number) => {
    if (window.innerWidth !== width) {
      width = window.innerWidth;
      centers = stops();
    }
    const p = TRACK_FROM + (1 - TRACK_FROM) * v;
    const move = philosophyMove(p, centers);
    for (const set of track) set(-move);
    // El isotipo de la intro: 0,8x, y se apaga mientras sale.
    for (const m of mark) {
      m.x(move * (1 - PHILOSOPHY_TRACK.introPiece));
      m.o(1 - clamp(move / (centers[0] * 0.6), 0, 1));
    }
    // El texto de un pilar no centrado se apaga: el entrante aparece en la
    // segunda mitad de su transición y el saliente se va en la primera. Del
    // vecino solo asoma su pieza.
    for (const c of copies) {
      const o = clamp(1 - Math.abs(move - centers[c.i]) / half, 0, 1);
      c.o(o);
      offstage(c, o < 0.5);
    }
    for (const o of intro) o(clamp(1 - move / (centers[0] / 2), 0, 1));
    for (const s of pieces) {
      const local = move - centers[s.i];
      const extra = PHILOSOPHY_TRACK.pieces - PHILOSOPHY_TRACK.text;
      // Se adelanta al entrar (1,22x) y sale a 1x: así nunca roza la columna.
      s.x(local < 0 ? clamp(-extra * local, 0, PIECE_SLACK) : 0);
      const centered = 1 - Math.min(1, Math.abs(local) / PHILOSOPHY_TRACK.pillar);
      s.o(0.35 + 0.65 * centered);
    }
    for (const w of words) {
      const local = move - centers[w.i];
      // Deriva suave (0,6x relativo a la pista, acotada) dentro de su columna.
      w.x(clamp(0.4 * local * 0.25, -60, 60));
      w.o(Math.max(0, 1 - Math.abs(local) / (PHILOSOPHY_TRACK.pillar * 0.6)));
    }
    // Cada barra se llena solo en su transición de entrada y su meseta.
    const step = (1 - TRACK_FROM) / bars.length;
    bars.forEach((set, i) => set(clamp((p - TRACK_FROM - i * step) / step, 0, 1)));

  };
  counter(tl, TRACK_FROM, 1, paint, "none");
};
