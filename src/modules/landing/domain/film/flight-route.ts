/**
 * La carta de navegación nocturna del piloto (plan §19.2, lienzo aprobado el
 * 2026-10-01): la aerovía con sus seis fijos, el circuito de espera, el espacio
 * restringido y el paisaje. Puro y estático: nada de esto se recalcula por
 * frame. Es la hermana de la meta (`route-map.ts`): el mismo mundo de
 * 2400 × 1500 y el mismo muestreo por longitud (`withLengths`, `goalPointAt`).
 */
import { GOAL_WORLD, goalPointAt, goalSlicePath, withLengths, type Point, type SampledRoute } from "./route-map";

export const FLIGHT_WORLD = GOAL_WORLD;

/**
 * Los puntos de control de la aerovía: la torre, los fijos, el rodeo del
 * espacio restringido (el 4) y el destino.
 */
export const FLIGHT_CONTROL: readonly Point[] = [
  { x: 300, y: 1290 },
  { x: 560, y: 1130 },
  { x: 830, y: 1010 },
  { x: 1100, y: 900 },
  { x: 1330, y: 955 },
  { x: 1570, y: 880 },
  { x: 1720, y: 720 },
  { x: 1960, y: 520 },
  { x: 2170, y: 360 },
];

/** Qué punto de control es cada uno de los seis fijos (los pasos del piloto). */
export const FLIGHT_FIX_CONTROL = [1, 2, 3, 5, 6, 7] as const;

/** Muestras por tramo de la Catmull-Rom. */
const PER_SEGMENT = 40;

/** La aerovía: una Catmull-Rom uniforme por los puntos de control, con sus longitudes. */
export function sampleFlightRoute(cp: readonly Point[] = FLIGHT_CONTROL, n = PER_SEGMENT): SampledRoute {
  const points: Point[] = [];
  for (let k = 0; k < cp.length - 1; k++) {
    const p0 = cp[k - 1] ?? cp[k];
    const p1 = cp[k];
    const p2 = cp[k + 1];
    const p3 = cp[k + 2] ?? cp[k + 1];
    for (let j = k ? 1 : 0; j <= n; j++) {
      const t = j / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      points.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return withLengths(points);
}

export const FLIGHT_ROUTE: SampledRoute = sampleFlightRoute();

/** La fracción de la aerovía en la que cae el punto de control `k` (la curva pasa por él). */
export function controlFraction(k: number, route: SampledRoute = FLIGHT_ROUTE, n = PER_SEGMENT): number {
  return route.lengths[k * n] / route.total;
}

/** Dónde está cada fijo, como fracción de la aerovía. */
export const FLIGHT_FIXES: readonly number[] = FLIGHT_FIX_CONTROL.map((k) => controlFraction(k));

/** El avión espera sobre el fijo 5, «Revisar la política». */
export const FLIGHT_HOLD_FRACTION = FLIGHT_FIXES[4];

export const flightPointAt = (f: number): Point => goalPointAt(f, FLIGHT_ROUTE);

/** El `d` de la aerovía entera (la recorrida avanza con `stroke-dasharray`, `pathLength=1`). */
export const FLIGHT_ROUTE_PATH: string = goalSlicePath(0, 1, FLIGHT_ROUTE);

/** El circuito de espera: un óvalo de 128 × 68 px sobre el fijo 5. */
export const FLIGHT_HOLD = { center: { x: FLIGHT_CONTROL[6].x, y: FLIGHT_CONTROL[6].y - 34 }, rx: 64, ry: 34 } as const;

/** Un punto del circuito; `th = 0` es el punto más cercano a la aerovía (abajo). */
export function holdPoint(th: number): Point {
  return { x: FLIGHT_HOLD.center.x + FLIGHT_HOLD.rx * Math.sin(th), y: FLIGHT_HOLD.center.y + FLIGHT_HOLD.ry * Math.cos(th) };
}

const fmt = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

function closedPath(pts: readonly Point[]): string {
  return pts.map((q, i) => `${i ? "L" : "M"}${fmt(q)}`).join("") + "Z";
}

export const FLIGHT_HOLD_PATH: string = closedPath(Array.from({ length: 49 }, (_, i) => holdPoint((i / 48) * Math.PI * 2)));

/** El espacio restringido (la política de contacto): un heptágono irregular que la ruta rodea. */
export const FLIGHT_ZONE_CENTER: Point = { x: 1420, y: 720 };

export function zoneVertices(): Point[] {
  return Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const r = 128 + 22 * Math.sin(i * 2.1);
    return { x: FLIGHT_ZONE_CENTER.x + r * Math.cos(a), y: FLIGHT_ZONE_CENTER.y + r * 0.82 * Math.sin(a) };
  });
}

export const FLIGHT_ZONE_PATH: string = closedPath(zoneVertices());

/** La torre (el radar de la escena anterior, en miniatura) y el punto que se enciende. */
export const FLIGHT_TOWER = { center: FLIGHT_CONTROL[0], rings: [44, 88, 132], blip: { x: 410, y: 1222 } } as const;

/** El aeropuerto de destino, «Demo agendada». */
export const FLIGHT_AIRPORT: Point = FLIGHT_CONTROL[FLIGHT_CONTROL.length - 1];

/** El río: una banda de 70 px al 3 %. */
export const FLIGHT_RIVER_PATH = "M-60 420C500 540 700 300 1200 430S1900 720 2460 560";

/** La silueta del avión, vista desde arriba (viewBox 24 × 24, apunta hacia arriba). */
export const PLANE_PATH =
  "M12 1.5c.9 0 1.6 1.4 1.6 3.4v4.3l8 4.6v2.2l-8-2.4v4.6l2.6 2v1.7L12 21l-4.2 1v-1.7l2.6-2v-4.6l-8 2.4v-2.2l8-4.6V4.9c0-2 .7-3.4 1.6-3.4z";

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Una capa de luces de pueblo: puntos del mismo grosor y opacidad, en un solo trazo. */
export type LightLayer = { d: string; width: number; opacity: number };

/**
 * El paisaje (solo lo pinta el servidor): retícula, curvas de nivel y luces de
 * pueblos. Cada capa es UN `path` (las luces, agrupadas por grosor y opacidad,
 * como puntos de trazo redondo de largo 0), para que el HTML pese poco.
 */
export function flightLandscape(): { grid: string; contours: string; lights: LightLayer[] } {
  let grid = "";
  for (let x = 300; x < FLIGHT_WORLD.w; x += 300) grid += `M${x} 0V${FLIGHT_WORLD.h}`;
  for (let y = 300; y < FLIGHT_WORLD.h; y += 300) grid += `M0 ${y}H${FLIGHT_WORLD.w}`;

  const hills: readonly [number, number, number, number][] = [
    [620, 520, 260, 4],
    [1640, 1180, 300, 4],
    [2080, 900, 180, 3],
    [980, 1340, 160, 2],
  ];
  let contours = "";
  hills.forEach(([cx, cy, R, n], h) => {
    for (let k = 0; k < n; k++) {
      const r0 = R * (1 - k * 0.22);
      const pts = Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        const r = r0 * (1 + 0.13 * Math.sin(3 * a + h * 1.7 + k * 0.4) + 0.07 * Math.sin(5 * a + h));
        return { x: cx + r * Math.cos(a), y: cy + r * 0.72 * Math.sin(a) };
      });
      contours += closedPath(pts);
    }
  });

  const towns: readonly [number, number][] = [
    [420, 900],
    [760, 640],
    [1180, 1180],
    [1480, 420],
    [1900, 760],
    [2240, 1180],
    [2050, 230],
    [1300, 650],
  ];
  const layers = new Map<string, LightLayer>();
  towns.forEach(([cx, cy], t) => {
    for (let i = 0; i < 22; i++) {
      const a = rnd(t * 50 + i) * Math.PI * 2;
      const r = 70 * Math.sqrt(rnd(t * 90 + i));
      const width = Math.round(2 * (1 + rnd(i + t) * 1.5));
      const opacity = Math.round((0.18 + rnd(i * 3 + t) * 0.22) * 20) / 20;
      const key = `${width}|${opacity}`;
      const layer = layers.get(key) ?? { d: "", width, opacity };
      layer.d += `M${fmt({ x: cx + r * Math.cos(a), y: cy + r * 0.7 * Math.sin(a) })}h0`;
      layers.set(key, layer);
    }
  });
  return { grid, contours, lights: [...layers.values()] };
}
