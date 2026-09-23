import type { DayKey } from "@/core/lib/business-time";
import type { CommercialPaceDTO, KeyResultKey, PlanInputsDTO } from "./commercial";

/**
 * El detalle de un resultado clave (`/comercial/resultados/[key]`) — módulo
 * PURO: qué tendencia se pinta, qué tasas del plan lo explican y a dónde
 * lleva el pie.
 */

/** Lo que se puede abrir en detalle: los resultados clave y el ticket. */
export type KeyResultDetailKey = KeyResultKey | "avg_ticket";

const DETAIL_KEYS: readonly KeyResultDetailKey[] = ["sales", "avg_ticket", "quotes", "meetings", "contacted", "leads", "calls"];

export function isKeyResultDetailKey(value: string): value is KeyResultDetailKey {
  return (DETAIL_KEYS as readonly string[]).includes(value);
}

export function keyResultHref(key: KeyResultDetailKey): string {
  return `/comercial/resultados/${key}`;
}

/** El sustantivo de cada resultado para «27 ventas · 63 %». */
export const KR_UNITS: Record<KeyResultKey, { one: string; many: string }> = {
  sales: { one: "venta", many: "ventas" },
  quotes: { one: "cotización", many: "cotizaciones" },
  meetings: { one: "cita", many: "citas" },
  contacted: { one: "contactado", many: "contactados" },
  leads: { one: "conversación", many: "conversaciones" },
  calls: { one: "llamada", many: "llamadas" },
};

export function unitOf(key: KeyResultKey, n: number): string {
  return n === 1 ? KR_UNITS[key].one : KR_UNITS[key].many;
}

export type PlanInputKey = keyof PlanInputsDTO;

export const PLAN_INPUT_LABELS: Record<PlanInputKey, string> = {
  avg_ticket_cents: "Ticket promedio",
  quote_to_sale: "Cotización → venta",
  meeting_to_sale: "Cita → venta",
  contact_to_quote: "Contactado → cotización",
  lead_to_contact: "Conversación → contactado",
  call_answer: "Llamadas contestadas",
  calls_share: "Contactos por llamada",
};

/**
 * «De dónde sale» cada resultado: las tasas del plan que lo producen, en el
 * orden en que se leen. Las ventas salen del ticket y de las dos tasas de
 * cierre; cada eslabón de arriba, de su propia tasa.
 */
export const KR_INPUTS: Record<KeyResultDetailKey, readonly PlanInputKey[]> = {
  sales: ["avg_ticket_cents", "quote_to_sale", "meeting_to_sale"],
  avg_ticket: ["avg_ticket_cents"],
  quotes: ["quote_to_sale"],
  meetings: ["meeting_to_sale"],
  contacted: ["contact_to_quote"],
  leads: ["lead_to_contact"],
  calls: ["calls_share", "call_answer"],
};

/**
 * El pie del detalle: dónde se ve el dato con más detalle. Ventas y
 * cotizaciones viven en el pipeline del CRM; lo de arriba del embudo, en
 * Analítica. `commercial` no importa de `crm`: enlaza por href.
 */
export const KR_FOOT_LINKS: Record<KeyResultDetailKey, { href: string; label: string }> = {
  sales: { href: "/crm/pipeline", label: "Ver en el CRM" },
  avg_ticket: { href: "/crm/pipeline", label: "Ver en el CRM" },
  quotes: { href: "/crm/pipeline", label: "Ver en el CRM" },
  contacted: { href: "/crm/contacts", label: "Ver en el CRM" },
  meetings: { href: "/analytics", label: "Ver en Analítica" },
  leads: { href: "/analytics", label: "Ver en Analítica" },
  calls: { href: "/analytics", label: "Ver en Analítica" },
};

export interface TrendPoint {
  [key: string]: string | number | null;
  date: string;
  /** Acumulado real; `null` después de hoy (el servidor arrastra el acumulado, no se pinta). */
  real: number | null;
  expected: number;
}

/**
 * La tendencia de VENTAS del mes, acumulada: real hasta hoy, esperado hasta el
 * fin del período. La serie del servidor ya es acumulada (no se suma aquí) y
 * sus días futuros repiten el último real: se cortan para no dibujar una
 * meseta que no ocurrió. Solo `sales` tiene serie en el contrato.
 */
export function salesTrend(series: CommercialPaceDTO["series"], today: DayKey): TrendPoint[] {
  return series.map((point) => ({
    date: point.date,
    real: point.date <= today ? point.sales : null,
    expected: point.expected_sales,
  }));
}

/** Proyección lineal al cierre: `actual ÷ días recorridos × días del mes`; `null` sin días. */
export function projectedCount(actual: number, daysElapsed: number, daysTotal: number): number | null {
  if (daysElapsed <= 0 || daysTotal <= 0) return null;
  return Math.round((actual / daysElapsed) * daysTotal);
}
