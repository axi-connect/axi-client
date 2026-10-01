/**
 * La geometría de la ruta (mockup «Rutas de captación»), en unidades del
 * `viewBox` de 1000×350. Las etiquetas HTML se clavan en % de la caja (no
 * escalan con el SVG), como en la ruta de Comercial.
 */
export const MAP_W = 1000;
export const MAP_H = 350;
/** Donde arrancan las cuentas: el cúmulo de negocios de la fuente. */
export const SOURCE_POINT = { x: 58, y: 146 };
/** «Lo que viene»: el destino tras la última parada. */
export const DEST_POINT = { x: 928, y: 104 };
/** Las cajas de desvío: ancho en unidades (212 px a 1000 de caja). */
export const EXIT_W = 212;
const EXIT_GAP = 12;
/** Donde se sienta Axi en el tramo que llega a su parada: al 80 %, para no tapar el nodo. */
export const AXI_AT = 0.8;

export interface Point {
  x: number;
  y: number;
}

/** Las paradas en una onda suave, de 150 a 778. */
export function stopPoints(count: number): Point[] {
  const first = 150;
  const last = 778;
  const step = count > 1 ? (last - first) / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => ({
    x: first + index * step,
    y: 128 + 38 * Math.sin(index * (6.3 / Math.max(1, count)) + 0.55),
  }));
}

/** El grosor de un tramo: 2 + 4·√(n/max) px; sin dato, nada. */
export function flowWidth(count: number | null, max: number): number {
  if (count === null) return 0;
  return 2 + 4 * Math.sqrt(Math.max(count, 0) / Math.max(1, max));
}

/** Un tramo como cúbica: sus cuatro puntos de control (una S horizontal). */
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

export function cubicPath([start, c1, c2, end]: Cubic): string {
  return `M${fmt(start.x)} ${fmt(start.y)} C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`;
}

/** Los tramos de la ruta: de la fuente a cada parada, y la cola hasta «Lo que viene». */
export function routeSegments(points: readonly Point[]): { segments: Cubic[]; tail: Cubic } {
  const segments = points.map((point, index) => segmentCubic(points[index - 1] ?? SOURCE_POINT, point));
  return { segments, tail: segmentCubic(points.at(-1) ?? SOURCE_POINT, DEST_POINT) };
}

/**
 * La ruta partida en una posición `at` (tramo + fracción: 2.8 es el 80 % del
 * tramo que llega a la tercera parada; el tramo 0 sale de la fuente; el tramo
 * `n` es la cola). Cada tramo dice qué parte va sólida y cuál punteada, así un
 * tramo es UN solo trazo que se vuelve sólido justo donde está Axi.
 */
export function splitAt(points: readonly Point[], at: number): { solid: (Cubic | null)[]; todo: (Cubic | null)[] } {
  const { segments, tail } = routeSegments(points);
  const all = [...segments, tail];
  const solid: (Cubic | null)[] = [];
  const todo: (Cubic | null)[] = [];
  all.forEach((cubic, index) => {
    const t = Math.min(1, Math.max(0, at - index));
    if (t >= 1) {
      solid.push(cubic);
      todo.push(null);
    } else if (t <= 0) {
      solid.push(null);
      todo.push(cubic);
    } else {
      const [behind, ahead] = splitCubic(cubic, t);
      solid.push(behind);
      todo.push(ahead);
    }
  });
  return { solid, todo };
}

/** Dónde va Axi en la posición `at`. */
export function pointAt(points: readonly Point[], at: number): Point {
  const { segments, tail } = routeSegments(points);
  const all = [...segments, tail];
  if (at <= 0) return SOURCE_POINT;
  const index = Math.min(Math.floor(at), all.length - 1);
  const cubic = all[index];
  if (cubic === undefined) return DEST_POINT;
  const t = Math.min(1, at - index);
  return splitCubic(cubic, t)[0][3];
}

/** El desvío de una parada: una rama de un pelo que sale a la derecha y baja hasta su caja. */
export function exitBranch(from: Point): { d: string; x: number } {
  const x = from.x + 66;
  return {
    d: `M${fmt(from.x)} ${fmt(from.y)} C${fmt(from.x + 46)} ${fmt(from.y + 3)} ${fmt(x)} ${fmt(from.y + 18)} ${fmt(x)} ${fmt(from.y + 72)} L${fmt(x)} ${fmt(MAP_H + 2)}`,
    x,
  };
}

/** Un desvío por donde aún no salió nadie: punteado y corto, sin caja. */
export function emptyBranch(from: Point): string {
  return `M${fmt(from.x)} ${fmt(from.y)} C${fmt(from.x + 40)} ${fmt(from.y + 3)} ${fmt(from.x + 60)} ${fmt(from.y + 16)} ${fmt(from.x + 62)} ${fmt(from.y + 60)}`;
}

/**
 * Dónde cae cada caja de desvío (su centro x): bajo su rama, empujada a la
 * derecha si pisa a la anterior y, si la última se sale, todas hacia la
 * izquierda. No se pisan ni se salen.
 */
export function exitCenters(desired: readonly number[]): number[] {
  const min = EXIT_W / 2 + 12;
  const max = MAP_W - EXIT_W / 2 - 12;
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

/** Las curvas de nivel del terreno, decorativas. */
export function contourPaths(): { d: string; soft: boolean }[] {
  const systems: [number, number, number[]][] = [
    [250, 330, [44, 70, 96, 122, 148]],
    [610, 60, [30, 54, 80, 106]],
    [905, 330, [36, 62, 90]],
    [430, 170, [22, 40]],
  ];
  const out: { d: string; soft: boolean }[] = [];
  systems.forEach(([cx, cy, radii], k) =>
    radii.forEach((r, j) => {
      let d = "";
      for (let a = 0; a <= 64; a += 1) {
        const t = (a / 64) * Math.PI * 2;
        const rr = r * (1 + 0.16 * Math.sin(3 * t + k * 1.7 + j * 0.35) + 0.08 * Math.sin(5 * t + k));
        d += `${a === 0 ? "M" : "L"}${fmt(cx + rr * 1.5 * Math.cos(t))} ${fmt(cy + rr * 0.78 * Math.sin(t))}`;
      }
      out.push({ d: `${d}Z`, soft: j % 2 === 1 });
    }),
  );
  return out;
}

/** El cúmulo de negocios encontrados en la fuente (hasta 40), en espiral. */
export function cityDots(count: number): Point[] {
  return Array.from({ length: Math.min(Math.max(count, 0), 40) }, (_, index) => {
    const angle = index * 2.399;
    const radius = 4 + Math.sqrt(index) * 5.2;
    return { x: SOURCE_POINT.x + radius * Math.cos(angle), y: SOURCE_POINT.y + radius * Math.sin(angle) * 0.8 };
  });
}

export const pct = (value: number, of: number) => `${String((value / of) * 100)}%`;

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}
