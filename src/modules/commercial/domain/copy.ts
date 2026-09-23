import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import type { GoalSeedDTO, GoalSource, PaceStatus, SourceKind } from "./commercial";
import { formatMillions, formatPct, formatRate, shortDay } from "./format";
import { sourceLabel } from "./labels";
import { dailyRateNeeded, gap } from "./pace";

/**
 * La voz «progreso» del módulo, en un solo sitio y testeada: las cifras son
 * camino recorrido y camino que falta, jamás un porcentaje negativo ni un
 * regaño. Las frases son las del plan (`commercial_method_plan.md`, «Microcopy
 * con la voz progreso»); cambiarlas aquí es cambiarlas en toda la pantalla.
 */

/** «1 venta al día» · «3 ventas al día». Siempre hacia arriba: 2,3 ventas no existen. */
export function salesPerDay(rate: number): string {
  const n = Math.max(1, Math.ceil(rate));
  return n === 1 ? "1 venta al día" : `${formatInteger(n)} ventas al día`;
}

/** «en los 6 días hábiles que quedan» · «en el día hábil que queda» · «hoy». */
export function daysLeftPhrase(days: number): string {
  if (days <= 0) return "hoy";
  if (days === 1) return "en el día hábil que queda";
  return `en los ${formatInteger(days)} días hábiles que quedan`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export interface PaceHeadlineInput {
  status: PaceStatus;
  currency: string;
  actual_cents: number;
  target_cents: number;
  expected_cents: number;
  projected_cents: number | null;
  sales_actual: number;
  sales_target: number;
  days_left: number;
  days_until_projection: number | null;
}

/**
 * La ÚNICA frase bajo la línea de la ruta. Una por estado, con las cifras
 * puestas. Nunca dice cuánto se falló: dice qué falta y qué hace falta hacer.
 */
export function paceHeadline(input: PaceHeadlineInput): string {
  const { currency } = input;
  const money = gap(input.actual_cents, input.target_cents);
  const sales = gap(input.sales_actual, input.sales_target);
  const perDay = salesPerDay(dailyRateNeeded(sales.missing, input.days_left));

  switch (input.status) {
    case "on_track":
      return `Vas al ritmo. Mantén ${perDay} y llegas.`;
    case "at_risk":
    case "behind":
      return `Para llegar faltan ${formatMillions(money.missing, currency)}: ${perDay} ${daysLeftPhrase(input.days_left)}.`;
    case "ahead": {
      const ahead = Math.max(0, input.actual_cents - input.expected_cents);
      const projected = input.projected_cents ?? input.actual_cents;
      return `Vas ${formatMillions(ahead, currency)} por delante de lo esperado (${formatMillions(input.expected_cents, currency)}). Si sigues así cierras en ${formatMillions(projected, currency)}.`;
    }
    case "achieved": {
      const d = Math.max(0, input.days_left);
      if (d === 0) return "Meta cumplida hoy. Lo que venga ahora es camino extra.";
      return `Meta cumplida con ${formatInteger(d)} ${plural(d, "día", "días")} de sobra. Lo que venga ahora es camino extra.`;
    }
    case "insufficient_data": {
      const d = Math.max(1, input.days_until_projection ?? 1);
      return `Estamos aprendiendo tu ritmo. En ${formatInteger(d)} ${plural(d, "día", "días")} tendrás proyección y acciones.`;
    }
  }
}

/**
 * «27 de 43 · faltan 16». Por delante de la meta: «45 de 43 · 2 por delante».
 * Justo en la meta: «43 de 43 · completo». Nunca un negativo.
 */
export function missingLine(actual: number, target: number): string {
  const { missing, surplus } = gap(actual, target);
  const head = `${formatInteger(actual)} de ${formatInteger(target)}`;
  if (missing > 0) return `${head} · ${missing === 1 ? "falta 1" : `faltan ${formatInteger(missing)}`}`;
  if (surplus > 0) return `${head} · ${formatInteger(surplus)} por delante`;
  return `${head} · completo`;
}

/** «cierre ≈ $ 24,6 M · 82 %». `null` sin proyección (aprendiendo). */
export function projectionLine(projectedCents: number | null, targetCents: number, currency: string): string | null {
  if (projectedCents === null || targetCents <= 0) return null;
  const pct = (projectedCents / targetCents) * 100;
  return `cierre ≈ ${formatMillions(projectedCents, currency)} · ${formatPct(pct)}`;
}

/** «Ritmo 1,35 al día · esperado 1,6 · según tu historia». */
export function rateLine(actualRate: number, expectedRate: number, source: SourceKind, nicheLabel?: string | null): string {
  return `Ritmo ${formatRate(actualRate)} al día · esperado ${formatRate(expectedRate)} · ${sourceLabel(source, nicheLabel)}`;
}

/** El aviso del estado «aprendiendo»: cuánto llevamos y los dos hitos del método. */
export function learningLine(daysElapsed: number): string {
  const d = Math.max(0, daysElapsed);
  const so_far = d === 0 ? "Aún no hay un día hábil de datos" : `Llevas ${formatInteger(d)} ${plural(d, "día hábil", "días hábiles")} de datos`;
  return `${so_far}; con 3 empezamos a proyectar, y a los 30 días tus tasas reales reemplazan los supuestos por tipo de negocio.`;
}

/**
 * El aviso de mitad de mes en el editor: lo recorrido se conserva y la ruta
 * se recalcula desde hoy. Dice qué falta con la meta actual antes de tocarla.
 */
export function midMonthLine(input: {
  currency: string;
  actual_cents: number;
  sales_actual: number;
  sales_target: number;
  days_left: number;
}): string {
  const { missing } = gap(input.sales_actual, input.sales_target);
  const rate = dailyRateNeeded(missing, input.days_left);
  return `Llevas ${formatMillions(input.actual_cents, input.currency)} y ${formatInteger(input.sales_actual)} ${plural(input.sales_actual, "venta", "ventas")}. Si mantienes la meta, la ruta se recalcula desde hoy: faltan ${formatInteger(missing)} ${plural(missing, "venta", "ventas")} ${daysLeftPhrase(input.days_left)} (${formatRate(rate, 1)} al día). Si la cambias, lo recorrido se conserva.`;
}

/**
 * La línea de semilla del estado vacío: la historia si la hay, si no el nicho.
 * Con historia y sin sugerencia del servidor, solo cuenta lo vendido.
 */
export function seedLine(seed: GoalSeedDTO | null, currency: string): string | null {
  if (seed === null) return null;
  if (seed.source !== "benchmark" && seed.last_month_revenue_cents !== null) {
    const base = `El mes pasado vendiste ${formatMoney(seed.last_month_revenue_cents, currency)}.`;
    if (seed.suggested_target_cents === null || seed.last_month_revenue_cents <= 0) return base;
    const lift = Math.round(((seed.suggested_target_cents - seed.last_month_revenue_cents) / seed.last_month_revenue_cents) * 100);
    const liftLabel = lift > 0 ? ` (+${String(lift)} %)` : "";
    return `${base} Una meta de ${formatMoney(seed.suggested_target_cents, currency)}${liftLabel} es alcanzable con tu ritmo.`;
  }
  const niche = seed.niche_label === null ? "tu tipo de negocio" : `«${seed.niche_label}»`;
  return `Aún no tenemos tu historia: te proponemos empezar con lo típico de ${niche}.`;
}

/** «Meta del mes: $ 30.000.000 · la pusiste tú el 1 sep». Quién la puso cambia el verbo. */
export function goalLead(targetCents: number, currency: string, source: GoalSource, setAtIso: string): string {
  const when = shortDay(setAtIso);
  const who =
    source === "intake" ? `la fijaste con Alba el ${when}` : source === "system" ? `la propuso axi el ${when}` : `la pusiste tú el ${when}`;
  return `Meta del mes: ${formatMoney(targetCents, currency)} · ${who}`;
}

/** Cabecera de la pantalla: «Tu ruta de septiembre». */
export function routeTitle(month: string): string {
  return `Tu ruta de ${month}`;
}

/** Confirmación al guardar la meta. */
export const GOAL_SAVED_MESSAGE = "Meta puesta. Empezamos a medir el camino.";

/** F3: las propuestas aún no se cargan (llegan con `GET /commercial/proposals`, F6). */
export const PROPOSALS_COMING_MESSAGE = "Las acciones que Axi propone llegan pronto.";

/** El estado vacío de «Axi propone» mientras no haya nada que acelerar (F6). */
export const NO_PROPOSALS_MESSAGE = "Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.";

/** El mismo hueco, en el estado «aprendiendo». */
export const LEARNING_PROPOSALS_MESSAGE = "Cuando conozcamos tu ritmo, te proponemos acciones.";
