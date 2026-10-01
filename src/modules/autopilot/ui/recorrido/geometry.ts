/**
 * Lo que la carta aérea toma de geometría (piloto, delta v4): el grosor de un
 * tramo, la cúbica partida en el avión y las cajas de desvío que no se pisan,
 * en unidades del `viewBox` de 1000 de ancho. Las etiquetas HTML se clavan en %
 * de la caja (`pct`), no escalan con el SVG.
 */
const CHART_WIDTH = 1000;
/** Las cajas de desvío: ancho en unidades (212 px a 1000 de caja). */
export const EXIT_W = 212;
const EXIT_GAP = 12;
/** Donde va el avión en el tramo que llega a su fijo: al 80 %, para no tapar el triángulo. */
export const AXI_AT = 0.8;

export interface Point {
  x: number;
  y: number;
}

/** Un tramo como cúbica: sus cuatro puntos de control. */
export type Cubic = readonly [Point, Point, Point, Point];

/** El grosor de un tramo: 2 + 4·√(n/max) px; sin dato, nada. */
export function flowWidth(count: number | null, max: number): number {
  if (count === null) return 0;
  return 2 + 4 * Math.sqrt(Math.max(count, 0) / Math.max(1, max));
}

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** De Casteljau: parte la cúbica en `t` y da las dos mitades (la de atrás y la de delante). */
export function splitCubic([p0, p1, p2, p3]: Cubic, t: number): [Cubic, Cubic] {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const f = lerp(d, e, t);
  return [
    [p0, a, d, f],
    [f, e, c, p3],
  ];
}

export function cubicPath([start, c1, c2, end]: Cubic): string {
  return `M${fmt(start.x)} ${fmt(start.y)} C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`;
}

/**
 * Dónde cae cada caja de desvío (su centro x): bajo su rama, empujada a la
 * derecha si pisa a la anterior y, si la última se sale, todas hacia la
 * izquierda. No se pisan ni se salen.
 */
export function exitCenters(desired: readonly number[]): number[] {
  const min = EXIT_W / 2 + 12;
  const max = CHART_WIDTH - EXIT_W / 2 - 12;
  const placed: number[] = [];
  for (const x of desired) {
    const previous = placed.at(-1);
    placed.push(Math.max(min, x, previous === undefined ? min : previous + EXIT_W + EXIT_GAP));
  }
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const next = placed[index + 1];
    const limit = next === undefined ? max : next - EXIT_W - EXIT_GAP;
    placed[index] = Math.min(placed[index] ?? min, limit);
  }
  return placed;
}

export const pct = (value: number, of: number) => `${String((value / of) * 100)}%`;

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}
