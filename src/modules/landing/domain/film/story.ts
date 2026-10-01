/**
 * El guion de lectura de una escena larga (piloto, meta): el scroll `p` no
 * recorre la historia a ritmo fijo. Cada nudo es [instante de la historia,
 * peso del tramo que llega a él, peso de su meseta]; los pesos se reparten el
 * scroll. En una meseta la historia se queda quieta (se lee); entre mesetas
 * avanza con ease de entrada y de salida (sin saltos). Puro: lo usan el
 * servidor (fotograma final, `storyAt(1)` = 1) y el motor.
 */
import { easeInOut, seg } from "./goal-camera";

export type StoryKnot = readonly [story: number, flight: number, hold: number];
/** Una meseta en `p`: [desde, hasta, instante de la historia]. */
export type StoryPlateau = readonly [from: number, to: number, story: number];

/** Las mesetas en `p` de unos nudos (el primero es el inicio, [0, 0, 0]). */
export function storyPlateaus(knots: readonly StoryKnot[]): readonly StoryPlateau[] {
  const total = knots.reduce((acc, [, flight, hold]) => acc + flight + hold, 0);
  const out: StoryPlateau[] = [];
  let at = 0;
  for (const [story, flight, hold] of knots.slice(1)) {
    at += flight / total;
    out.push([at, at + hold / total, story]);
    at += hold / total;
  }
  return out;
}

/** El instante de la historia en el scroll `p`. */
export function storyAt(p: number, plateaus: readonly StoryPlateau[]): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let from = 0;
  let story = 0;
  for (const [a, b, s] of plateaus) {
    if (p < a) return story + (s - story) * easeInOut(seg(p, from, a));
    if (p <= b) return s;
    from = b;
    story = s;
  }
  return 1;
}
