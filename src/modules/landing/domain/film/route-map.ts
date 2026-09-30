/**
 * Geometría del mapa de la meta de la película (escena «Crecer»).
 *
 * TypeScript puro y determinista: el servidor pinta las marcas en su sitio
 * final con estas funciones y el motor de animación las mueve con las mismas,
 * así que el fotograma final y la animación nunca discrepan.
 *
 * El lienzo mide 1440 × 900 (el del storyboard). La carretera es la del
 * storyboard aprobado, ya reducida y corrida para dejar libre la columna del
 * panel de navegación, a la derecha.
 */

export const MAP_WIDTH = 1440;
export const MAP_HEIGHT = 900;

export type Point = { x: number; y: number };
type Segment = readonly [Point, Point, Point, Point];

/**
 * El storyboard, reducido a 0,68 y corrido (−40, +310): la carretera pasa por
 * DEBAJO del titular y termina antes del panel de navegación, así ninguna
 * marca cae sobre texto (render del 2026-09-30).
 */
const RAW: readonly (readonly [number, number])[][] = [
  [[70, 830], [260, 800], [330, 650], [520, 640]],
  [[520, 640], [700, 630], [720, 470], [880, 440]],
  [[880, 440], [1040, 410], [1060, 250], [1210, 220]],
  [[1210, 220], [1290, 205], [1320, 185], [1350, 175]],
];

const SEGMENTS: readonly Segment[] = RAW.map(
  (seg) => seg.map(([x, y]) => ({ x: -40 + 0.68 * x, y: 310 + 0.68 * y })) as unknown as Segment,
);

function bezier([p0, c1, c2, p3]: Segment, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

/** Muestreo por longitud de arco: una fracción de la meta es una fracción del camino. */
const SAMPLES: { points: Point[]; lengths: number[] } = (() => {
  const points: Point[] = [];
  for (const seg of SEGMENTS) for (let i = 0; i < 120; i++) points.push(bezier(seg, i / 120));
  points.push(SEGMENTS[SEGMENTS.length - 1][3]);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points, lengths };
})();

/** Punto de la carretera a una fracción (0–1) de su longitud, en coordenadas del lienzo. */
export function roadPointAt(fraction: number): Point {
  const f = Math.min(1, Math.max(0, fraction));
  const { points, lengths } = SAMPLES;
  const target = f * lengths[lengths.length - 1];
  let lo = 0;
  let hi = lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return points[0];
  const span = lengths[lo] - lengths[lo - 1] || 1;
  const k = (target - lengths[lo - 1]) / span;
  return { x: points[lo - 1].x + (points[lo].x - points[lo - 1].x) * k, y: points[lo - 1].y + (points[lo].y - points[lo - 1].y) * k };
}

/** El mismo punto, en porcentaje del lienzo: para colocar marcas HTML encima del SVG. */
export function roadPercentAt(fraction: number): { left: string; top: string } {
  const p = roadPointAt(fraction);
  return { left: `${((p.x / MAP_WIDTH) * 100).toFixed(3)}%`, top: `${((p.y / MAP_HEIGHT) * 100).toFixed(3)}%` };
}

/** El atributo `d` de la carretera. */
export const ROAD_PATH: string = (() => {
  const f = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = `M ${f(SEGMENTS[0][0])}`;
  for (const [, c1, c2, p3] of SEGMENTS) d += ` C ${f(c1)}, ${f(c2)}, ${f(p3)}`;
  return d;
})();

export type Block = { x: number; y: number; w: number; h: number };

/**
 * Las manzanas de la ciudad: una rejilla con huecos y tamaños deterministas
 * (generador de Park–Miller con semilla fija). Mismo resultado en servidor y
 * cliente: nada de `Math.random()`, que rompería la hidratación.
 */
export function cityBlocks(seed = 3, cell = 74, gap = 12): Block[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out: Block[] = [];
  for (let x = 0; x < MAP_WIDTH; x += cell) {
    for (let y = 0; y < MAP_HEIGHT; y += cell) {
      if (rnd() < 0.12) continue;
      const w = cell - gap - [0, 0, 10, 20][Math.floor(rnd() * 4)];
      const h = cell - gap - [0, 0, 10][Math.floor(rnd() * 3)];
      out.push({ x, y, w, h });
    }
  }
  return out;
}
