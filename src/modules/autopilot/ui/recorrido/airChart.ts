/**
 * La carta de navegación aérea nocturna de una salida (Piloto,
 * delta v4, mockup aprobado el 2026-10-01): la geometría literal del mockup
 * (`chartGeom`, `chartLand`), en unidades de un `viewBox` de 1000×380. Es el
 * mismo lenguaje que el mapa de la landing (§19.2).
 */
import type { Cubic, Point } from "./geometry";

export const CHART_W = 1000;
export const CHART_H = 380;
/** La torre: la fuente, de donde despega el piloto. */
export const TOWER: Point = { x: 84, y: 318 };
/** El aeropuerto: «Lo que viene». */
export const AIRPORT: Point = { x: 936, y: 92 };
/** El espacio restringido (tu política), que la aerovía rodea. */
export const RESTRICTED: Point = { x: 612, y: 300 };

/** Los fijos: con tu aprobación son 7 paradas; por su cuenta, 6. */
const FIX7: Point[] = [
  { x: 150, y: 296 },
  { x: 256, y: 262 },
  { x: 364, y: 238 },
  { x: 470, y: 228 },
  { x: 592, y: 170 },
  { x: 698, y: 150 },
  { x: 808, y: 136 },
];
const FIX6: Point[] = [
  { x: 150, y: 296 },
  { x: 268, y: 260 },
  { x: 384, y: 236 },
  { x: 500, y: 226 },
  { x: 632, y: 164 },
  { x: 784, y: 138 },
];

/**
 * La aerovía: un hilo continuo (Catmull-Rom → cúbicas) por la torre, cada fijo
 * y el aeropuerto. `segments[i]` llega al fijo `i`; el último, al aeropuerto.
 */
export function airway(count: number): { fixes: Point[]; segments: Cubic[] } {
  const fixes = count === 7 ? FIX7 : count === 6 ? FIX6 : spread(count);
  const chain = [TOWER, ...fixes, AIRPORT];
  const segments: Cubic[] = [];
  for (let k = 0; k < chain.length - 1; k += 1) {
    const p1 = chain[k] ?? TOWER;
    const p2 = chain[k + 1] ?? AIRPORT;
    const p0 = chain[k - 1] ?? p1;
    const p3 = chain[k + 2] ?? p2;
    segments.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ]);
  }
  return { fixes, segments };
}

/** Para un número de paradas fuera del contrato (no debería pasar): repartidas entre la torre y el aeropuerto. */
function spread(count: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / (count + 1);
    return { x: TOWER.x + (AIRPORT.x - TOWER.x) * t, y: TOWER.y + (AIRPORT.y - TOWER.y) * t };
  });
}

/** Hacia dónde mira el avión al final de un tramo, en grados. */
export function headingOf(cubic: Cubic): number {
  const [, , c2, end] = cubic;
  return (Math.atan2(end.y - c2.y, end.x - c2.x) * 180) / Math.PI;
}

/** Un número pseudoaleatorio fijo por semilla: el paisaje es el mismo en cada render. */
function seeded(index: number, a: number, b: number): number {
  return Math.abs(Math.sin(index * a + b) * 43758.5) % 1;
}

const fmt = (value: number) => String(Math.round(value * 10) / 10);

/** El paisaje estático: retícula, curvas de nivel, río, luces de pueblos y el polígono restringido. */
export const LAND = (() => {
  let grid = "";
  for (let x = 100; x < CHART_W; x += 100) grid += `M${String(x)} 0V${String(CHART_H)}`;
  for (let y = 95; y < CHART_H; y += 95) grid += `M0 ${String(y)}H${String(CHART_W)}`;
  let contours = "";
  const systems: [number, number, number, number, number][] = [
    [220, 96, 70, 4, 0],
    [470, 350, 90, 4, 1.3],
    [880, 300, 70, 3, 2.1],
    [300, 250, 34, 2, 0.7],
  ];
  for (const [cx, cy, radius, rings, phase] of systems) {
    for (let k = 0; k < rings; k += 1) {
      const r = radius * (1 - k / (rings + 0.6));
      let d = "";
      for (let a = 0; a <= 60; a += 1) {
        const t = (a / 60) * Math.PI * 2;
        const rr = r * (1 + 0.18 * Math.sin(3 * t + phase + k * 0.4) + 0.07 * Math.sin(5 * t + phase));
        d += `${a === 0 ? "M" : "L"}${fmt(cx + rr * 1.6 * Math.cos(t))} ${fmt(cy + rr * 0.85 * Math.sin(t))}`;
      }
      contours += `${d}Z`;
    }
  }
  const lights = Array.from({ length: 70 }, (_, index) => ({
    x: seeded(index, 127.1, 311.7) * CHART_W,
    y: seeded(index, 269.5, 183.3) * CHART_H,
    glow: seeded(index, 419.2, 71.9),
  }));
  const zone =
    Array.from({ length: 7 }, (_, index) => {
      const a = (index / 7) * Math.PI * 2 + 0.3;
      const r = 1 + 0.16 * Math.sin(index * 2.1);
      return `${index === 0 ? "M" : "L"}${fmt(RESTRICTED.x + 78 * r * Math.cos(a))} ${fmt(RESTRICTED.y + 42 * r * Math.sin(a))}`;
    }).join("") + "Z";
  return {
    grid,
    contours,
    lights,
    zone,
    river: "M-20 210C180 250 260 150 430 200S700 330 1020 250",
    farAirways: ["M-10 64C220 40 360 20 520 -10", "M640 392C760 330 880 300 1010 286", "M180 392C210 360 240 340 300 300"],
  };
})();

/** La silueta del avión vista desde arriba (mira hacia arriba: se gira a la tangente + 90°). */
export const TOP_PLANE_PATH =
  "M12 1.5c.9 0 1.6 1.4 1.6 3.4v4.3l8 4.6v2.2l-8-2.4v4.6l2.6 2v1.7L12 21l-4.2 1v-1.7l2.6-2v-4.6l-8 2.4v-2.2l8-4.6V4.9c0-2 .7-3.4 1.6-3.4z";
