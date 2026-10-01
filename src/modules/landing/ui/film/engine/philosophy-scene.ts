/**
 * «Vendemos progreso» en el motor (plan §18): en escritorio la escena se fija y
 * el scroll vertical mueve la pista horizontal en tres capas de parallax.
 * Tiempos del lienzo, con `p` de 0 a 1:
 * - 0,03–0,14: el isotipo de la intro se desarma (solo translate) y aparece
 *   «Tres piezas · un solo sistema».
 * - 0,1–1: la pista recorre la intro y los tres pilares. Palabras al 0,6x,
 *   texto al 1x, la pieza de la intro al 0,8x (se apaga entre 0,12 y 0,3) y las
 *   piezas de los pilares al 1,22x, con su opacidad (0,35 → 1) según lo centrado
 *   que esté su pilar. Abajo, la barra de cada pilar se llena en su tercio.
 * En móvil no hay nada que hacer: las tarjetas son scroll-snap nativo.
 */
import { gsap } from "gsap";

import { PHILOSOPHY_TRACK, philosophyTravel } from "@/modules/landing/domain/film/philosophy-content";
import { atP, counter, num, showIn, spanTimeline, visible, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

const TRACK_FROM = 0.1;
const TRACK_SPAN = 1 - TRACK_FROM;

export const philosophy: Scene = (section, ctx) => {
  if (!ctx.desktop) return;
  const tl = spanTimeline(section, ctx, 380);
  const vw = () => window.innerWidth;
  const travel = () => philosophyTravel(vw());

  // El desarme: cada cinta por su dirección natural. Sin giro ni escala.
  for (const el of visible(section, "[data-anim=philo-split]")) {
    tl.fromTo(el, { x: 0, y: 0 }, { x: num(el, "dx"), y: num(el, "dy"), ease: "power3.out", duration: atP(0.11) }, atP(0.03));
  }
  showIn(tl, visible(section, "[data-anim=philo-split-caption]"), 0.08, 0.14, 6);

  // Las capas: la pista al 1x y las palabras al 0,6x.
  const track = visible(section, "[data-anim=philo-track]");
  const words = visible(section, "[data-anim=philo-words]");
  const along = { ease: "none", duration: atP(TRACK_SPAN) };
  if (track.length) tl.fromTo(track, { x: 0 }, { ...along, x: () => -travel() }, atP(TRACK_FROM));
  if (words.length) tl.fromTo(words, { x: 0 }, { ...along, x: () => -travel() * PHILOSOPHY_TRACK.words }, atP(TRACK_FROM));

  // La pieza de la intro va dentro de la pista: +0,2x la deja en 0,8x.
  const mark = visible(section, "[data-anim=philo-mark]");
  if (mark.length) {
    tl.fromTo(mark, { x: 0 }, { ...along, x: () => travel() * (1 - PHILOSOPHY_TRACK.introPiece) }, atP(TRACK_FROM));
    tl.fromTo(mark, { opacity: 1 }, { opacity: 0, ease: "none", duration: atP(0.18) }, atP(0.12));
  }

  // Las piezas de los pilares: 1,22x alrededor del momento en que su pilar está
  // centrado; ahí la pieza queda en su sitio y con opacidad plena.
  const pieces = visible(section, "[data-anim=philo-piece]");
  const extra = PHILOSOPHY_TRACK.pieces - PHILOSOPHY_TRACK.text;
  const centeredAt = (i: number) => vw() + i * PHILOSOPHY_TRACK.pillar - (vw() - PHILOSOPHY_TRACK.pillar) / 2;
  const setters = pieces.map((el) => ({ i: num(el, "index"), x: gsap.quickSetter(el, "x", "px"), o: gsap.quickSetter(el, "opacity") }));
  // Las palabras miden más que un pilar: a 0,6x se montarían unas sobre otras.
  // Se ve solo la del pilar que está en el centro (mismo criterio que la pieza).
  const wordSetters = visible(section, "[data-anim=philo-word]").map((el) => ({ i: num(el, "index"), o: gsap.quickSetter(el, "opacity") }));
  counter(
    tl,
    TRACK_FROM,
    1,
    (v) => {
      const move = v * travel();
      for (const s of setters) {
        const local = move - centeredAt(s.i);
        s.x(-extra * local);
        const centered = 1 - Math.min(1, (Math.abs(local) / (3 * PHILOSOPHY_TRACK.pillar)) * 2.2);
        s.o(0.35 + 0.65 * Math.max(0, centered));
      }
      for (const w of wordSetters) {
        const local = move - centeredAt(w.i);
        w.o(Math.max(0, 1 - (Math.abs(local) / (3 * PHILOSOPHY_TRACK.pillar)) * 3.3));
      }
    },
    "none",
  );

  // La barra de cada pilar se llena en su tercio de la pista.
  visible(section, "[data-anim=philo-bar]").forEach((el, i) => {
    tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, ease: "none", duration: atP(TRACK_SPAN / 3) }, atP(TRACK_FROM + (TRACK_SPAN * i) / 3));
  });
};
