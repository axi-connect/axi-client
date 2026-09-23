import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import type { FunnelLiveRates, FunnelPipelineStage } from "./analytics";

/**
 * «Tasas vivas» y «Recorrido del pipeline» de Conversión (método comercial
 * F7) — módulo PURO. Cada fila lleva su divisor en la línea secundaria («52 de
 * 84 llamadas») y se OMITE si su muestra es 0 o el servidor no la midió
 * (`null`): ninguna cifra se inventa, y un «0 %» sobre cero llamadas diría
 * algo que no pasó.
 */

export interface LiveRateRow {
  key: string;
  label: string;
  value: string;
  secondary: string;
  /** Regla fina 0–100; `null` en las filas de dinero. */
  pct: number | null;
  /** La tasa con la que se traza la ruta del mes: regla llena, no tenue. */
  primary?: boolean;
}

/** «61,9 %»: el servidor manda un decimal; nunca negativo. */
export function formatRatePct(value: number): string {
  const safe = Math.max(0, value);
  return `${safe.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

function plural(n: number, one: string, many: string): string {
  return `${formatInteger(n)} ${n === 1 ? one : many}`;
}

export function liveRateRows(rates: FunnelLiveRates, currency: string): LiveRateRow[] {
  const s = rates.samples;
  const rows: LiveRateRow[] = [];
  const rate = (key: string, label: string, value: number | null, divisor: number, secondary: string, primary = false) => {
    if (value === null || divisor <= 0) return;
    rows.push({ key, label, value: formatRatePct(value), secondary, pct: Math.min(100, Math.max(0, value)), primary });
  };

  rate(
    "call_answer",
    "Llamadas → contestadas",
    rates.call_answer_rate,
    s.calls_placed,
    `${formatInteger(s.calls_answered)} de ${plural(s.calls_placed, "llamada", "llamadas")}`,
  );
  rate(
    "answered_to_meeting",
    "Contestadas → cita agendada",
    rates.answered_to_meeting_rate,
    s.calls_answered,
    `${plural(s.appointments_booked, "cita", "citas")} sobre ${plural(s.calls_answered, "contestada", "contestadas")}`,
  );
  rate(
    "meeting_show",
    "Cita agendada → asistió",
    rates.meeting_show_rate,
    s.appointments_booked,
    `${formatInteger(s.appointments_completed)} de ${plural(s.appointments_booked, "cita", "citas")}${
      s.appointments_no_show > 0 ? ` · ${plural(s.appointments_no_show, "no asistió", "no asistieron")}` : ""
    }`,
  );
  rate(
    "meeting_to_sale",
    "Cita agendada → venta",
    rates.meeting_to_sale_rate,
    s.appointments_booked,
    `${plural(s.orders_paid, "venta", "ventas")} sobre ${plural(s.appointments_booked, "cita agendada", "citas agendadas")}`,
  );
  // Derivada de los MISMOS conteos del servidor (ventas pagadas ÷ asistencias):
  // el contrato no la trae como tasa, pero sí sus dos términos.
  if (s.appointments_completed > 0) {
    rate(
      "visit_to_sale",
      "Asistió → venta",
      Math.round((s.orders_paid / s.appointments_completed) * 1000) / 10,
      s.appointments_completed,
      `${plural(s.orders_paid, "venta", "ventas")} sobre ${plural(s.appointments_completed, "visita", "visitas")}`,
    );
  }
  rate(
    "quote_to_sale",
    "Cotización → venta",
    rates.quote_to_sale_rate,
    s.quotes,
    `${plural(s.orders_paid, "venta", "ventas")} sobre ${plural(s.quotes, "cotización", "cotizaciones")} · la tasa que usa la ruta`,
    true,
  );
  if (rates.value_per_meeting_cents !== null && s.appointments_booked > 0) {
    rows.push({
      key: "value_per_meeting",
      label: "Valor por cita agendada",
      value: formatMoney(rates.value_per_meeting_cents, currency),
      secondary: `${formatMoney(s.revenue_paid_cents, currency)} ÷ ${plural(s.appointments_booked, "cita agendada", "citas agendadas")}`,
      pct: null,
    });
  }
  if (rates.value_per_visit_cents !== null && s.appointments_completed > 0) {
    rows.push({
      key: "value_per_visit",
      label: "Valor por visita",
      value: formatMoney(rates.value_per_visit_cents, currency),
      secondary: `${formatMoney(s.revenue_paid_cents, currency)} ÷ ${plural(s.appointments_completed, "persona que asistió", "personas que asistieron")}`,
      pct: null,
    });
  }
  return rows;
}

export interface PipelineFlowRow {
  key: string;
  /** «Nuevo → Contactado» (la última etapa, solo su nombre). */
  label: string;
  /** «71 % avanza» · «Sin movimientos». */
  value: string;
  /** «42 de 59 · 3,2 días en promedio». */
  secondary: string;
  pct: number | null;
}

/**
 * Una fila por etapa, YA en orden semántico (lo decide el llamador con el
 * orden del CRM). El nombre es el que el tenant le puso; `fallbackLabel` solo
 * cubre un nombre vacío.
 */
export function pipelineFlowRows(stages: readonly FunnelPipelineStage[], fallbackLabel: (kind: FunnelPipelineStage["stage_kind"]) => string): PipelineFlowRow[] {
  const name = (stage: FunnelPipelineStage) => (stage.name.trim() === "" ? fallbackLabel(stage.stage_kind) : stage.name);
  return stages.map((stage, index) => {
    const next = stages[index + 1];
    const days =
      stage.avg_days_in_stage === null
        ? null
        : `${stage.avg_days_in_stage.toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${stage.avg_days_in_stage === 1 ? "día" : "días"} en promedio`;
    const counts = `${formatInteger(stage.advanced)} de ${formatInteger(stage.entered)}`;
    return {
      key: stage.stage_kind,
      label: next === undefined ? name(stage) : `${name(stage)} → ${name(next)}`,
      value: stage.conversion_pct === null ? "Sin movimientos" : `${String(Math.max(0, stage.conversion_pct))} % avanza`,
      secondary: days === null ? counts : `${counts} · ${days}`,
      pct: stage.conversion_pct,
    };
  });
}
