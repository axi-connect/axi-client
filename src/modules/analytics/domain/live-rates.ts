import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import type { FunnelLiveRates, FunnelPipelineStage } from "./analytics";

/**
 * «Tasas vivas» y «Recorrido del pipeline» de Conversión (método comercial
 * F7) — módulo PURO. Cada fila lleva su muestra en la línea secundaria («52 de
 * 84 llamadas») y se OMITE si no hay muestra o el servidor no la midió
 * (`null`): ninguna cifra se inventa, y un «0 %» sobre cero llamadas diría
 * algo que no pasó.
 */

/**
 * Una fila de las dos tarjetas (`RateList`): etiqueta → cifra, la muestra
 * debajo y una regla fina. La MISMA forma para las tasas y para las etapas.
 */
export interface RateRow {
  key: string;
  label: string;
  value: string;
  secondary: string;
  /** Regla fina 0–100; `null` en las filas de dinero. */
  pct: number | null;
  /** La tasa con la que se traza la ruta del mes: regla llena, no tenue. */
  primary?: boolean;
}

/** Las tasas de cierre que puede usar la ruta del mes (`commercial/public` `RouteRateKey`). */
export type RouteRate = "quote_to_sale" | "meeting_to_sale";

/** «61,9 %»: el servidor manda un decimal; nunca negativo. */
export function formatRatePct(value: number): string {
  const safe = Math.max(0, value);
  return `${safe.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

function plural(n: number, one: string, many: string): string {
  return `${formatInteger(n)} ${n === 1 ? one : many}`;
}

type RateSampleKey = keyof FunnelLiveRates["rate_samples"];

const ROUTE_NOTE = " · la tasa que usa la ruta";

/**
 * Las filas de «Tasas vivas».
 *
 * La línea secundaria sale de `rate_samples[key]` —numerador y denominador de
 * ESA tasa, del mismo cálculo del servidor— como «X de N»; si el servidor aún
 * no la manda, solo el divisor en crudo («sobre N contestadas»), que nunca
 * contradice la tasa (C2). Una tasa por encima de 100 o que el servidor topó
 * (`capped`: más numerador que denominador) no es una tasa y la fila se omite
 * (C3). `routeRates` marca las tasas que usa la ruta del mes, leídas del
 * plan; sin plan no se marca ninguna (C11).
 */
export function liveRateRows(rates: FunnelLiveRates, currency: string, routeRates: ReadonlySet<RouteRate> | null = null): RateRow[] {
  const s = rates.samples;
  // Tolerante: un servidor anterior a `rate_samples` no lo trae.
  const samples = (rates as Partial<FunnelLiveRates>).rate_samples;
  const rows: RateRow[] = [];

  const rate = (
    key: RateSampleKey,
    label: string,
    value: number | null,
    fallbackDivisor: number,
    ofSample: (numerator: number, denominator: number) => string,
    fallback: string,
  ) => {
    const sample = samples?.[key] ?? null;
    const divisor = sample?.denominator ?? fallbackDivisor;
    if (value === null || divisor <= 0 || value > 100 || sample?.capped === true) return;
    const inRoute = routeRates?.has(key as RouteRate) === true;
    const secondary = (sample === null ? fallback : ofSample(sample.numerator, sample.denominator)) + (inRoute ? ROUTE_NOTE : "");
    rows.push({ key, label, value: formatRatePct(value), secondary, pct: Math.max(0, value), primary: inRoute });
  };

  rate(
    "call_answer",
    "Llamadas → contestadas",
    rates.call_answer_rate,
    s.calls_placed,
    (n, d) => `${formatInteger(n)} de ${plural(d, "llamada", "llamadas")}`,
    `sobre ${plural(s.calls_placed, "llamada", "llamadas")}`,
  );
  rate(
    "answered_to_meeting",
    "Contestadas → cita agendada",
    rates.answered_to_meeting_rate,
    s.calls_answered,
    (n, d) => `${formatInteger(n)} de ${plural(d, "contestada", "contestadas")}`,
    `sobre ${plural(s.calls_answered, "contestada", "contestadas")}`,
  );
  rate(
    "meeting_show",
    "Cita agendada → asistió",
    rates.meeting_show_rate,
    s.appointments_booked,
    (n, d) =>
      `${formatInteger(n)} de ${plural(d, "cita", "citas")}${
        s.appointments_no_show > 0 ? ` · ${plural(s.appointments_no_show, "no asistió", "no asistieron")}` : ""
      }`,
    `sobre ${plural(s.appointments_booked, "cita", "citas")}`,
  );
  // `meeting_to_sale` del servidor = ventas de contactos con cita COMPLETADA ÷
  // citas completadas (la cohorte del plan): por eso «Asistió → venta» y su
  // divisor son las que asistieron, no las agendadas.
  rate(
    "meeting_to_sale",
    "Asistió → venta",
    rates.meeting_to_sale_rate,
    s.appointments_completed,
    (n, d) => `${formatInteger(n)} de ${plural(d, "persona que asistió", "personas que asistieron")}`,
    `sobre ${plural(s.appointments_completed, "persona que asistió", "personas que asistieron")}`,
  );
  rate(
    "quote_to_sale",
    "Cotización → venta",
    rates.quote_to_sale_rate,
    s.quotes,
    (n, d) => `${formatInteger(n)} de ${plural(d, "cotización", "cotizaciones")}`,
    `sobre ${plural(s.quotes, "cotización", "cotizaciones")}`,
  );
  if (rates.value_per_meeting_cents !== null && s.appointments_booked > 0) {
    rows.push({
      key: "value_per_meeting",
      label: "Valor por cita agendada",
      value: formatMoney(rates.value_per_meeting_cents, currency),
      secondary: "valor por visita × asistencia",
      pct: null,
    });
  }
  if (rates.value_per_visit_cents !== null && s.appointments_completed > 0) {
    rows.push({
      key: "value_per_visit",
      label: "Valor por visita",
      value: formatMoney(rates.value_per_visit_cents, currency),
      secondary: "ticket promedio × cierre de quien asistió",
      pct: null,
    });
  }
  return rows;
}

/**
 * Una fila por etapa, YA en orden semántico (lo decide el llamador con el
 * orden del CRM). El nombre es el que el tenant le puso; `fallbackLabel` solo
 * cubre un nombre vacío.
 */
export function pipelineFlowRows(stages: readonly FunnelPipelineStage[], fallbackLabel: (kind: FunnelPipelineStage["stage_kind"]) => string): RateRow[] {
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
