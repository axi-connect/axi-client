import type { Schemas } from "@/core/api/types";

/**
 * Consola de margen (Tanda C3). Los tipos salen del contrato generado; aquí
 * viven solo las etiquetas y los formatos. NINGUNA cifra de costo o margen se
 * calcula en el cliente: inventarla con constantes sería repetir el error del
 * `margin_multiplier`. Todo dato lleva su origen: «medido» o «declarado».
 */
export type MarginSample = Schemas["MarginSampleDto"];
export type MarginSegment = MarginSample["sample"]["segments"][number];
export type MarginCalls = MarginSample["sample"]["calls"];
export type MarginParameters = MarginSample["parameters"];
export type MarginSimulation = Schemas["MarginSimulationDto"];
export type SimulateMarginDTO = Schemas["SimulateMarginDto"];
export type MarginCells = Schemas["MarginCellsDto"];
export type MarginCell = MarginCells["cells"][number];
export type MarginGateReport = Schemas["PublishedBatchDto"]["margin"];
export type GateFailure = MarginGateReport["failures"][number];
export type MarginBasis = MarginGateReport["basis"];
export type TrafficLight = MarginCell["status"];
export type SampleConfidence = MarginSegment["confidence"];
export type SampleScope = MarginCell["sample_scope"];
/** Con qué se aprobó una celda publicada: la base de la verja, guardada con la publicación. */
export type PricePublication = NonNullable<Schemas["BillingPriceListDto"]["data"][number]["publication"]>;

export const BASIS_LABELS: Record<MarginBasis, string> = {
  measured: "medido",
  declared: "declarado",
  mixed: "medido + declarado",
};

export const SCOPE_LABELS: Record<SampleScope, string> = {
  plan: "muestra del plan",
  global: "muestra global",
};

export const STATUS_LABELS: Record<TrafficLight, string> = {
  ok: "Vende con recurrente",
  bonus_only: "Solo bono al canal",
  loses: "Pierde dinero",
};

/** Clases de la celda/semáforo por estado: verde recurrente, ámbar bono, rojo pierde. */
export const STATUS_CLASSES: Record<TrafficLight, string> = {
  ok: "border-success/40 bg-success/10 text-success",
  bonus_only: "border-warning/50 bg-warning/10 text-warning",
  loses: "border-destructive/50 bg-destructive/10 text-destructive",
};

export const GATE_CHECK_LABELS: Record<string, string> = {
  margin_min: "Margen de lista bajo el mínimo",
  loses_at_p90: "Pierde dinero a p90",
  quota_cap: "La cuota no cabe en el tope",
  promo_margin_min: "Margen con promoción bajo el mínimo",
  margin_unverified: "Base declarada, no medida",
  additivity: "Aditividad",
  rounding: "Redondeo",
  monotonic: "Monotonía",
  decreasing: "Precio por conversación",
  override: "Anulación",
};

export const SEGMENT_LABELS: Record<MarginSegment["segment"], string> = {
  text: "Solo texto",
  voice: "Con voz",
};

export const METRIC_LABELS: Record<string, string> = {
  ai_tokens_output: "Tokens de salida",
  ai_tokens_input: "Tokens de entrada",
  ai_requests: "Peticiones IA",
  ai_conversations: "Conversaciones (eje de volumen)",
  tts_characters: "Caracteres de voz (TTS)",
  external_api_calls: "Transcripción y APIs externas",
  messages_sent: "Mensajes enviados",
  messages_received: "Mensajes recibidos",
  storage_bytes: "Almacenamiento",
  call_seconds: "Segundos de llamada",
  template_sent: "Plantillas de Meta",
  lead_discoveries: "Leads descubiertos",
  lead_enrichments: "Leads verificados",
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}

/** Un percentil sobre menos de 30 unidades no es firme: se dice, no se esconde. */
export function confidenceLabel(confidence: SampleConfidence, n: number): string | null {
  return confidence === "low" ? `muestra baja · ${n}` : null;
}

/** Proporción 0–1 como porcentaje con una decimal («72,6 %»). −1 = sin ingreso neto. */
export function formatPct(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio) || ratio <= -1) return "—";
  return `${(ratio * 100).toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

/** Puntos básicos como porcentaje («7.000 bps» ⇒ «70 %»). */
export function bpsToPct(bps: number): string {
  return `${(bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
}

/** Dólares con la precisión que pide la magnitud: un costo de conversación tiene 4 decimales, un COGS 2. */
export function formatUsd(usd: number): string {
  const digits = Math.abs(usd) >= 1 ? 2 : 4;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Pesos redondos a partir de dólares y la TRM declarada. */
export function usdToCopCents(usd: number, trm: number): number {
  return Math.round(usd * trm * 100);
}

export function cellStatus(
  cells: readonly MarginCell[] | undefined,
  planCode: string,
  tierCode: string,
  interval: MarginCell["interval"],
): MarginCell | null {
  return cells?.find((cell) => cell.plan_code === planCode && cell.tier_code === tierCode && cell.interval === interval) ?? null;
}

/** Resumen de la rejilla para la verja en vivo: peor estado y cuántas celdas fallan. */
export function summarizeCells(cells: readonly MarginCell[]): {
  failing: number;
  worst: TrafficLight;
  minP50: number | null;
} {
  let failing = 0;
  let worst: TrafficLight = "ok";
  let minP50: number | null = null;
  for (const cell of cells) {
    if (cell.failures.length > 0) failing += 1;
    if (cell.status === "loses") worst = "loses";
    else if (cell.status === "bonus_only" && worst === "ok") worst = "bonus_only";
    minP50 = minP50 === null ? cell.margin_real_p50 : Math.min(minP50, cell.margin_real_p50);
  }
  return { failing, worst, minP50 };
}
