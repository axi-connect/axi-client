import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialPaceDTO, CommercialPlanDTO, CommercialProposalDTO, KeyResultKey, PaceStatus } from "./commercial";
import { formatMillions, formatPct, formatRate } from "./format";
import { KR_ORDER } from "./labels";
import { gap, isLearning, ratioPct } from "./pace";
import { proposalHeadline } from "./proposals";

/**
 * La ruta del mes como navegación (C3, canvas aprobado 2026-09-27) — módulo
 * PURO. La carretera es una curva fija en un `viewBox`; las marcas (vas aquí,
 * deberías ir, llegas, semanas, meta) caen sobre ella por FRACCIÓN de la meta.
 * Todo lo que se dice sale del ritmo, del plan y de las acciones pendientes.
 */

type P = readonly [number, number];
type Segment = readonly [P, P, P, P];

export interface RoadLayout {
  /** Caja del `viewBox`: las etiquetas HTML se colocan en % de ella. */
  width: number;
  height: number;
  segments: readonly Segment[];
}

/**
 * Ancho: la carretera deja libre la franja izquierda, donde flota el panel de
 * navegación, y cruza arriba a la derecha hasta la meta (canvas 1).
 */
export const WIDE_ROAD: RoadLayout = scaleY(
  {
    width: 1100,
    height: 660,
    segments: [
      [[470, 620], [560, 621], [560, 560], [620, 530]],
      [[620, 530], [690, 492], [700, 455], [780, 440]],
      [[780, 440], [900, 417], [960, 380], [900, 335]],
      [[900, 335], [840, 290], [640, 327], [640, 260]],
      [[640, 260], [640, 200], [860, 222], [960, 192]],
      [[960, 192], [1030, 170], [1040, 150], [1045, 128]],
    ],
  },
  860,
);

/** Estrecho: el mapa va solo, arriba, y la carretera usa todo el ancho (canvas 3). */
export const NARROW_ROAD: RoadLayout = {
  width: 400,
  height: 380,
  segments: [
    [[50, 340], [115, 340], [125, 268], [180, 250]],
    [[180, 250], [245, 228], [295, 268], [305, 196]],
    [[305, 196], [315, 132], [195, 114], [215, 50]],
    [[215, 50], [231, 22], [300, 22], [340, 18]],
  ],
};

/**
 * El destino (C3b, canvas 2): la carretera sale abajo a la izquierda, bajo el
 * buscador, y sube hasta la meta arriba a la derecha, sobre «Así queda tu viaje».
 */
export const DESTINATION_ROAD: RoadLayout = {
  width: 1100,
  height: 700,
  segments: [
    [[120, 620], [240, 622], [330, 600], [430, 560]],
    [[430, 560], [540, 515], [600, 470], [570, 400]],
    [[570, 400], [540, 330], [520, 270], [600, 230]],
    [[600, 230], [680, 190], [780, 190], [860, 160]],
    [[860, 160], [920, 138], [960, 120], [1000, 96]],
  ],
};

/**
 * Dónde cae cada parada del camino al revés: repartidas a lo largo de la
 * carretera, sin tocar la salida ni la meta (n paradas → n + 1 tramos iguales,
 * dentro del 8 %–92 %).
 */
export function stopFractions(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => 0.08 + (0.84 * (i + 1)) / (count + 1));
}

export interface RoadPoint {
  x: number;
  y: number;
}

export interface SampledRoad {
  layout: RoadLayout;
  points: readonly RoadPoint[];
  /** Distancia acumulada hasta cada punto. */
  lengths: readonly number[];
}

/** El mismo trazado en una caja más alta (el panel de navegación necesita el alto). */
function scaleY(layout: RoadLayout, height: number): RoadLayout {
  const k = height / layout.height;
  const map = (p: P): P => [p[0], Math.round(p[1] * k)];
  return { width: layout.width, height, segments: layout.segments.map(([a, b, c, d]) => [map(a), map(b), map(c), map(d)] as const) };
}

function bezier(seg: Segment, t: number): RoadPoint {
  const u = 1 - t;
  const [p0, p1, p2, p3] = seg;
  return {
    x: u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
    y: u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
  };
}

/** Muestrea la carretera: con los puntos y sus distancias, una fracción de la meta es un punto del camino. */
export function sampleRoad(layout: RoadLayout, perSegment = 120): SampledRoad {
  const points: RoadPoint[] = [];
  for (const seg of layout.segments) {
    for (let i = 0; i < perSegment; i += 1) points.push(bezier(seg, i / perSegment));
  }
  const last = layout.segments[layout.segments.length - 1][3];
  points.push({ x: last[0], y: last[1] });
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { layout, points, lengths };
}

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** El punto de la carretera a esa fracción (0 = salida, 1 = meta), acotada. */
export function pointAt(road: SampledRoad, fraction: number): RoadPoint {
  const total = road.lengths[road.lengths.length - 1];
  const target = total * clamp01(fraction);
  for (let i = 1; i < road.lengths.length; i += 1) {
    if (road.lengths[i] >= target) {
      const span = road.lengths[i] - road.lengths[i - 1] || 1;
      const k = (target - road.lengths[i - 1]) / span;
      const a = road.points[i - 1];
      const b = road.points[i];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return road.points[road.points.length - 1];
}

/** El tramo entre dos fracciones, como `points` de un `<polyline>`. Vacío si no hay tramo. */
export function roadSlice(road: SampledRoad, from: number, to: number): string {
  const f0 = clamp01(from);
  const f1 = clamp01(to);
  if (f1 <= f0) return "";
  const total = road.lengths[road.lengths.length - 1];
  const inner = road.points.filter((_, i) => road.lengths[i] > total * f0 && road.lengths[i] < total * f1);
  return [pointAt(road, f0), ...inner, pointAt(road, f1)].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** El `d` de la carretera completa, para el borde y el punteado. */
export function roadPath(layout: RoadLayout): string {
  const [first] = layout.segments;
  return [
    `M ${String(first[0][0])} ${String(first[0][1])}`,
    ...layout.segments.map(([, a, b, c]) => `C ${String(a[0])} ${String(a[1])}, ${String(b[0])} ${String(b[1])}, ${String(c[0])} ${String(c[1])}`),
  ].join(" ");
}

// ── Indicaciones de hoy ─────────────────────────────────────────────────────

const STEP_VERBS: Record<KeyResultKey, (n: number) => string> = {
  sales: (n) => `Cierra ${formatInteger(n)} ${n === 1 ? "venta" : "ventas"} hoy`,
  quotes: (n) => `Envía ${formatInteger(n)} ${n === 1 ? "cotización" : "cotizaciones"}`,
  meetings: (n) => `Agenda ${formatInteger(n)} ${n === 1 ? "cita" : "citas"}`,
  contacted: (n) => `Contacta a ${formatInteger(n)} ${n === 1 ? "persona" : "personas"}`,
  leads: (n) => `Abre ${formatInteger(n)} ${n === 1 ? "conversación" : "conversaciones"}`,
  calls: (n) => `Haz ${formatInteger(n)} ${n === 1 ? "llamada" : "llamadas"}`,
};

export interface TodayStep {
  key: KeyResultKey;
  title: string;
  detail: string;
  status: PaceStatus;
  offPace: boolean;
}

/**
 * Las indicaciones del día, como un navegador: por cada resultado clave con
 * camino por delante, lo que falta ÷ los días hábiles que quedan (hacia
 * arriba: media venta no existe). Las de ritmo bajo van primero, en el orden
 * del plan; hasta `limit`. En aprendiendo no hay indicaciones (no se afirma
 * ritmo) y con la meta cumplida tampoco.
 */
export function todaySteps(pace: Pick<CommercialPaceDTO, "key_results" | "business_days_left" | "status" | "data_sufficiency">, limit = 4): TodayStep[] {
  if (isLearning(pace) || pace.status === "achieved") return [];
  const days = Math.max(1, pace.business_days_left);
  const steps = KR_ORDER.flatMap((key): TodayStep[] => {
    const kr = pace.key_results.find((row) => row.key === key);
    if (kr === undefined) return [];
    const { missing } = gap(kr.actual, kr.target);
    if (missing <= 0) return [];
    const perDay = Math.max(1, Math.ceil(missing / days));
    const offPace = kr.status === "behind" || kr.status === "at_risk";
    return [
      {
        key,
        title: STEP_VERBS[key](perDay),
        detail: `vas a ${formatRate(kr.daily_rate_actual)} al día · ${missing === 1 ? "falta 1" : `faltan ${formatInteger(missing)}`}`,
        status: kr.status,
        offPace,
      },
    ];
  });
  return [...steps.filter((s) => s.offPace), ...steps.filter((s) => !s.offPace)].slice(0, limit);
}

// ── Rutas: la actual y las que prepara Axi ──────────────────────────────────

export interface RouteOption {
  /** `null` = seguir al ritmo de hoy. */
  id: string | null;
  kicker: string;
  title: string;
  /** Llegada a la meta, 0–∞ (puede pasar de 1). `null` sin proyección (aprendiendo). */
  arrival: number | null;
  /** «≈ $ 26,0 M» o `null` sin proyección. */
  money: string | null;
  /** «87 %» o `null`. */
  pct: string | null;
  expiresAt: string | null;
  proposal: CommercialProposalDTO | null;
}

/**
 * La ruta actual y una por cada acción pendiente con ventas estimadas. La
 * llegada con una acción = la proyección del servidor + ventas estimadas ×
 * el ticket del plan (o el real si el plan no lo trae). Es una estimación y
 * se dice con «≈»; sin proyección (aprendiendo) las rutas no prometen llegada.
 */
export function routeOptions(
  pace: Pick<CommercialPaceDTO, "projected_revenue_cents" | "target_revenue_cents" | "currency" | "avg_ticket_actual_cents" | "status" | "data_sufficiency">,
  plan: Pick<CommercialPlanDTO, "inputs"> | null,
  proposals: readonly CommercialProposalDTO[],
): RouteOption[] {
  const target = pace.target_revenue_cents;
  const base = isLearning(pace) || target <= 0 ? null : pace.projected_revenue_cents;
  const ticket = plan?.inputs.avg_ticket_cents?.value ?? pace.avg_ticket_actual_cents ?? null;
  const arrivalOf = (cents: number | null) => (cents === null || target <= 0 ? null : cents / target);
  const describe = (cents: number | null) => ({
    arrival: arrivalOf(cents),
    money: cents === null ? null : `≈ ${formatMillions(cents, pace.currency)}`,
    pct: cents === null ? null : formatPct(ratioPct(cents, target)),
  });

  const actual: RouteOption = { id: null, kicker: "Ruta actual", title: "Seguir al ritmo de hoy", expiresAt: null, proposal: null, ...describe(base) };
  const alternatives = proposals
    .filter((proposal) => proposal.status === "pending")
    .map((proposal): RouteOption => {
      const estimated = proposal.estimated_sales ?? 0;
      const cents = base === null || ticket === null || estimated <= 0 ? null : base + estimated * ticket;
      const { primary } = proposalHeadline(proposal);
      const gain = estimated > 0 ? `+${formatInteger(estimated)} ${estimated === 1 ? "venta" : "ventas"}` : (primary ?? "Acción propuesta");
      return { id: proposal.id, kicker: gain, title: proposal.title, expiresAt: proposal.expires_at, proposal, ...describe(cents) };
    })
    // La que más acerca, primero.
    .sort((a, b) => (b.arrival ?? -1) - (a.arrival ?? -1));
  return [actual, ...alternatives];
}
