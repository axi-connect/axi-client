/**
 * La geometría del recorrido de escritorio, en unidades del `viewBox`. Las
 * etiquetas HTML se clavan en % de la caja (no escalan con el SVG), como en la
 * ruta de Comercial.
 */
export const MAP_W = 860;
/** El alto del recorrido; las cajas de salida van debajo, en flujo (crecen con su texto). */
export const MAP_H = 300;
/** Donde arrancan las cuentas: la fuente, en el borde izquierdo. */
export const SOURCE_POINT = { x: 10, y: 176 };
/** La cola tras la última parada: baja hacia la bandera de la secuencia (arriba va la leyenda). */
const TAIL_DROP = 60;
/** Las cajas de salida: ancho en unidades; su trazo baja hasta el borde del recorrido. */
export const EXIT_W = 196;
export const EXIT_TOP = MAP_H;
const EXIT_GAP = 10;

export interface Point {
  x: number;
  y: number;
}

/** Las paradas en una onda suave, repartidas a lo ancho. */
export function stopPoints(count: number): Point[] {
  const first = 72;
  const last = MAP_W - 96;
  const step = count <= 1 ? 0 : (last - first) / (count - 1);
  return Array.from({ length: count }, (_, index) => ({
    x: first + index * step,
    y: 176 + 28 * Math.sin(index * 0.95 + 0.4),
  }));
}

export function tailPoint(points: readonly Point[]): Point {
  const end = points.at(-1) ?? SOURCE_POINT;
  return { x: MAP_W - 16, y: end.y + TAIL_DROP };
}

/** Curva por los puntos: cada tramo, una S horizontal. */
export function curvePath(points: readonly Point[]): string {
  const [head, ...rest] = points;
  if (head === undefined) return "";
  let d = `M${fmt(head.x)} ${fmt(head.y)}`;
  let previous = head;
  for (const point of rest) {
    const mid = (previous.x + point.x) / 2;
    d += ` C${fmt(mid)} ${fmt(previous.y)} ${fmt(mid)} ${fmt(point.y)} ${fmt(point.x)} ${fmt(point.y)}`;
    previous = point;
  }
  return d;
}

/** De una parada a su caja de salida: baja y se abre. */
export function exitPath(from: Point, to: Point): string {
  return `M${fmt(from.x)} ${fmt(from.y)} C${fmt(from.x)} ${fmt(from.y + 70)} ${fmt(to.x)} ${fmt(to.y - 70)} ${fmt(to.x)} ${fmt(to.y)}`;
}

/**
 * Dónde cae cada caja de salida (su centro x): bajo su parada, empujada a la
 * derecha si pisa a la anterior y, si la última se sale, todas hacia la
 * izquierda. Con cuatro salidas (el máximo) caben a lo ancho.
 */
export function exitCenters(desired: readonly number[]): number[] {
  const min = EXIT_W / 2 + 8;
  const max = MAP_W - EXIT_W / 2 - 8;
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

/** Un tramo como cúbica: sus cuatro puntos de control (la misma S de `curvePath`). */
export type Cubic = readonly [Point, Point, Point, Point];

export function segmentCubic(from: Point, to: Point): Cubic {
  const mid = (from.x + to.x) / 2;
  return [from, { x: mid, y: from.y }, { x: mid, y: to.y }, to];
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

/** Varias cúbicas seguidas, como un solo trazo. */
export function cubicsPath(cubics: readonly Cubic[]): string {
  const [first] = cubics;
  if (first === undefined) return "";
  let d = `M${fmt(first[0].x)} ${fmt(first[0].y)}`;
  for (const [, c1, c2, end] of cubics) {
    d += ` C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`;
  }
  return d;
}

/**
 * El recorrido partido en una posición `at` (tramo + fracción: 2.6 es el 60 %
 * del tramo que llega a la tercera parada; el tramo 0 sale de la fuente):
 * lo recorrido, lo que falta y el punto donde va el avión.
 */
export function splitRoute(points: readonly Point[], at: number): { done: string; todo: string; plane: Point; heading: number } {
  const cubics = points.map((point, index) => segmentCubic(points[index - 1] ?? SOURCE_POINT, point));
  const clamped = Math.min(Math.max(at, 0), cubics.length);
  const index = Math.min(Math.floor(clamped), cubics.length - 1);
  const t = clamped - index;
  const current = cubics[index];
  if (current === undefined) return { done: "", todo: "", plane: SOURCE_POINT, heading: 0 };
  const [behind, ahead] = splitCubic(current, t);
  return {
    done: cubicsPath([...cubics.slice(0, index), behind]),
    todo: cubicsPath([ahead, ...cubics.slice(index + 1)]),
    plane: behind[3],
    // Hacia dónde mira el avión: la tangente en el corte (del último control al punto).
    heading: tangentDegrees(behind, ahead),
  };
}

function tangentDegrees(behind: Cubic, ahead: Cubic): number {
  const from = behind[2];
  const to = ahead[1];
  if (from.x === to.x && from.y === to.y) return 0;
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

export const pct = (value: number, of: number) => `${String((value / of) * 100)}%`;

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}
