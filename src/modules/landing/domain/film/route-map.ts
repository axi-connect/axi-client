/**
 * Geometría del mapa de la meta de la película (escena «Crecer»).
 *
 * TypeScript puro y determinista: el servidor pinta el fotograma final con
 * estas funciones y el motor de animación anima con las mismas, así que el
 * HTML y la animación nunca discrepan.
 *
 * Dos mapas:
 * - **La ciudad en rejilla** (plan §16.1, lienzo «Landing · La meta»): un
 *   mundo de 2400 × 1500 con manzanas, río y una ruta por los ejes de las
 *   calles. Es el de la escena (`scenes/goal.tsx`) y lo mira la cámara de
 *   `goal-camera.ts`.
 * - **La carretera del storyboard** (abajo): solo la usa el hilo de luz
 *   archivado (§15, `thread-path.ts`). Se conserva para que el hilo pueda
 *   volver; se retira cuando se rediseñe su recorrido.
 */

export type Point = { x: number; y: number };

/* ─────────────────────────── la ciudad en rejilla ─────────────────────────── */

export const GOAL_WORLD = { w: 2400, h: 1500 } as const;

/** Celda de la rejilla: manzana de 82 px y calle de 18. */
const CELL = 100;
const BLOCK = 82;
/** Radio de las esquinas de la ruta. */
export const GOAL_CORNER_RADIUS = 46;

/**
 * La ruta, por los ejes de las calles (k·100 − 9) y en escalera hacia la meta:
 * de la salida, abajo a la izquierda, a la bandera, arriba a la derecha.
 */
export const GOAL_WAYPOINTS: readonly Point[] = [
  [291, 1391], [291, 1091], [691, 1091], [691, 891], [1091, 891], [1091, 691],
  [1491, 691], [1491, 491], [1891, 491], [1891, 291], [2191, 291],
].map(([x, y]) => ({ x, y }));

/** Paso del muestreo en los tramos rectos (px del mundo) y puntos por curva. */
const STEP = 6;
const CORNER_STEPS = 12;

export type SampledRoute = { points: readonly Point[]; lengths: readonly number[]; total: number };

/**
 * La ruta muestreada: rectas cada `STEP` px y cada esquina como una cuadrática
 * de radio `radius` (del punto a `radius` antes del vértice al punto a
 * `radius` después, con el vértice de control). Con las longitudes
 * acumuladas, una fracción de la meta es una fracción del camino.
 */
export function sampleGoalRoute(way: readonly Point[] = GOAL_WAYPOINTS, radius = GOAL_CORNER_RADIUS): SampledRoute {
  const points: Point[] = [];
  for (let i = 0; i < way.length - 1; i++) {
    const a = way[i];
    const b = way[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const from = i === 0 ? 0 : radius;
    const to = i === way.length - 2 ? len : len - radius;
    for (let d = from; d < to; d += STEP) points.push({ x: a.x + ux * d, y: a.y + uy * d });
    points.push({ x: a.x + ux * to, y: a.y + uy * to });
    if (i < way.length - 2) {
      const c = way[i + 2];
      const l2 = Math.hypot(c.x - b.x, c.y - b.y);
      const p0 = { x: b.x - ux * radius, y: b.y - uy * radius };
      const p2 = { x: b.x + ((c.x - b.x) / l2) * radius, y: b.y + ((c.y - b.y) / l2) * radius };
      for (let k = 1; k < CORNER_STEPS; k++) {
        const t = k / CORNER_STEPS;
        const u = 1 - t;
        points.push({ x: u * u * p0.x + 2 * u * t * b.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * b.y + t * t * p2.y });
      }
    }
  }
  return withLengths(points);
}

/**
 * Una polilínea con sus longitudes acumuladas: lo que hace falta para que una
 * fracción sea una fracción del camino (`goalPointAt`, `goalSlicePath`). La
 * usan la calle de la meta y la aerovía del piloto (`flight-route.ts`).
 */
export function withLengths(points: readonly Point[]): SampledRoute {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

export const GOAL_ROUTE: SampledRoute = sampleGoalRoute();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Índice del primer punto muestreado que alcanza la fracción `f` del camino. */
function indexAt(route: SampledRoute, f: number): number {
  const target = clamp01(f) * route.total;
  let lo = 0;
  let hi = route.lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (route.lengths[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Punto de la ruta a una fracción (0–1) de su longitud, interpolado entre muestras. */
export function goalPointAt(f: number, route: SampledRoute = GOAL_ROUTE): Point {
  const i = indexAt(route, f);
  if (i === 0) return route.points[0];
  const target = clamp01(f) * route.total;
  const span = route.lengths[i] - route.lengths[i - 1] || 1;
  const k = (target - route.lengths[i - 1]) / span;
  const a = route.points[i - 1];
  const b = route.points[i];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

const fmt = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

/**
 * El `d` del tramo [a, b] de la ruta. Vacío si el tramo no tiene largo. Solo
 * para dibujar trazos fijos: lo que avanza con el scroll usa
 * `stroke-dasharray` sobre la ruta entera (`pathLength=1`), nunca un `d` nuevo
 * por frame (§16.1, rendimiento).
 */
export function goalSlicePath(a: number, b: number, route: SampledRoute = GOAL_ROUTE): string {
  const from = clamp01(a);
  const to = clamp01(b);
  if (to <= from) return "";
  const i = indexAt(route, from);
  const j = indexAt(route, to);
  let d = `M ${fmt(goalPointAt(from, route))}`;
  for (let k = i; k < j; k++) {
    if (route.lengths[k] > from * route.total) d += ` L ${fmt(route.points[k])}`;
  }
  return `${d} L ${fmt(goalPointAt(to, route))}`;
}

/** La ruta entera, el `d` de todas sus capas. */
export const GOAL_ROUTE_PATH: string = goalSlicePath(0, 1);

/** El río: una banda de 90 px que cruza la ciudad por abajo (relleno al 3,5 %). */
export const GOAL_RIVER_PATH = "M -100 1180 C 400 1080, 700 1320, 1200 1220 S 2000 900, 2500 980";

export type CityBlock = { x: number; y: number; w: number; h: number; park: boolean };

/** El hash del lienzo (seno con semilla): determinista en servidor y cliente. */
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Las manzanas: una por celda de 100, con huecos (≈ 8 %), algunas más cortas
 * y ≈ 5 % de parques. Las mismas que el lienzo aprobado.
 */
export function goalCityBlocks(): CityBlock[] {
  const out: CityBlock[] = [];
  let n = 0;
  for (let x = 0; x < GOAL_WORLD.w; x += CELL) {
    for (let y = 0; y < GOAL_WORLD.h; y += CELL) {
      n++;
      if (hash(n) < 0.08) continue;
      out.push({
        x,
        y,
        w: BLOCK - (hash(n + 9) < 0.3 ? 14 : 0),
        h: BLOCK - (hash(n + 19) < 0.3 ? 12 : 0),
        park: hash(n + 500) < 0.05,
      });
    }
  }
  return out;
}

/* ─────────────── la carretera del storyboard (hilo archivado, §15) ─────────────── */

export const MAP_WIDTH = 1440;
export const MAP_HEIGHT = 900;

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
