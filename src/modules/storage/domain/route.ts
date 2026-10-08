import { formatStorageBytes, hasQuota, shortMonth, type StorageSummaryDTO } from "./storage";

/**
 * Geometría de «Tu ritmo» (mockup `route()`): el tramo recorrido desde la
 * serie diaria, el punto de hoy y, si el espacio va a llenarse, la proyección
 * punteada hasta el tope. Coordenadas en el viewBox del SVG; la vista solo
 * pinta.
 */
export const ROUTE_WIDTH = 300;
const PLOT_HEIGHT = 96;
const TOP = 12;
const PAD_X = 8;
export const ROUTE_HEIGHT = TOP + PLOT_HEIGHT + 18;
const DAY_MS = 86_400_000;
/** La proyección no se dibuja más allá de dos veces lo recorrido: aplastaría la historia. */
const MAX_PROJECTION_FACTOR = 2;

export type RoutePoint = { x: number; y: number };

export type RouteModel = {
  done: RoutePoint[];
  area: RoutePoint[];
  now: RoutePoint;
  /** Proyección hasta el tope (o hasta donde cabe). */
  projection: { to: RoutePoint; reachesCap: boolean; label: string } | null;
  capY: number;
  capLabel: string;
  labels: { x: number; text: string }[];
  baseY: number;
};

function dayTime(day: string): number {
  const time = new Date(day.length === 10 ? `${day}T00:00:00Z` : day).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
}

export function routeModel(summary: StorageSummaryDTO): RouteModel | null {
  if (!hasQuota(summary)) return null;
  const series = summary.growth.series
    .map((point) => ({ t: dayTime(point.day), bytes: Math.max(0, point.bytes) }))
    .filter((point) => Number.isFinite(point.t))
    .sort((a, b) => a.t - b.t);
  if (series.length < 2) return null;

  const quota = summary.quota_bytes;
  const start = series[0].t;
  const last = series[series.length - 1];
  const span = Math.max(DAY_MS, last.t - start);

  const days = summary.growth.days_to_full;
  const projecting = summary.state !== "full" && days !== null && days > 0;
  const projectionMs = projecting ? Math.min(days * DAY_MS, span * MAX_PROJECTION_FACTOR) : 0;
  const reachesCap = projecting && days * DAY_MS <= span * MAX_PROJECTION_FACTOR;
  const end = last.t + projectionMs;

  const maxBytes = Math.max(quota, ...series.map((point) => point.bytes)) * 1.07;
  const x = (t: number) => PAD_X + ((t - start) / Math.max(DAY_MS, end - start)) * (ROUTE_WIDTH - PAD_X * 2);
  const y = (bytes: number) => TOP + (1 - bytes / maxBytes) * PLOT_HEIGHT;
  const baseY = y(0);

  const done = series.map((point) => ({ x: x(point.t), y: y(point.bytes) }));
  const now = done[done.length - 1];

  let projection: RouteModel["projection"] = null;
  if (projecting) {
    // Recta de hoy al tope: si se recorta, termina donde cae la fracción del camino.
    const fraction = days * DAY_MS > 0 ? projectionMs / (days * DAY_MS) : 1;
    const bytesAtEnd = last.bytes + (quota - last.bytes) * Math.min(1, fraction);
    const endDate = new Date(last.t + days * DAY_MS);
    projection = {
      to: { x: x(end), y: y(bytesAtEnd) },
      reachesCap,
      label: `≈ ${shortMonth(endDate)}`,
    };
  }

  const labels: RouteModel["labels"] = [
    { x: done[0].x, text: shortMonth(new Date(start)) },
    { x: now.x, text: "hoy" },
  ];
  if (projection?.reachesCap) labels.push({ x: projection.to.x, text: shortMonth(new Date(last.t + (days ?? 0) * DAY_MS)) });

  return {
    done,
    area: [{ x: done[0].x, y: baseY }, ...done, { x: now.x, y: baseY }],
    now,
    projection,
    capY: y(quota),
    capLabel: `${formatStorageBytes(quota)} · tu tope`,
    labels,
    baseY,
  };
}

export function toPoints(points: readonly RoutePoint[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}
