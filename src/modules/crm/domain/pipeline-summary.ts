import { formatMoney } from "@/core/lib/format";
import { DEAL_EVENT_LABELS, type DealDTO, type DealEventDTO, type DealStatsDTO } from "./deal";
import { daysInStage } from "./deal-state";

/**
 * Derivaciones puras del pipeline premium (plan `crm_premium_plan.md` §1).
 * Todo sale de lecturas que ya existen —board, stats, pipelines y eventos—:
 * aquí no se inventa ninguna cifra, solo se cuenta y se nombra.
 */

/** Lo que una oportunidad aporta al pronóstico: valor × probabilidad de su etapa. */
export function weightedCents(valueCents: number | null, probabilityPct: number): number {
  if (valueCents === null || !Number.isFinite(valueCents)) return 0;
  const pct = Math.min(100, Math.max(0, probabilityPct));
  return Math.round((valueCents * pct) / 100);
}

export type StallInfo = { days: number; limit: number };

/**
 * Cuánto lleva quieta y cuánto aguanta su etapa, SOLO si ya se enfrió
 * (mismo criterio que `isStalled`: `días ≥ rotting_days`). `null` = en
 * movimiento, o una etapa que no expira.
 */
export function stallInfo(
  deal: Pick<DealDTO, "status" | "stage_entered_at">,
  rottingDays: number | null | undefined,
  now: Date = new Date(),
): StallInfo | null {
  if (deal.status !== "open") return null;
  if (rottingDays === null || rottingDays === undefined || rottingDays <= 0) return null;
  const days = daysInStage(deal.stage_entered_at, now);
  return days >= rottingDays ? { days, limit: rottingDays } : null;
}

export type CoolingDeal = StallInfo & { deal: DealDTO; stageName: string };

type StageLike = { id: string; name: string; rotting_days: number | null };

/**
 * Las oportunidades que se enfrían, primero la que más se pasó de su etapa
 * (y, a igual exceso, la de más valor). Es la lista de «Lo próximo».
 */
export function coolingDeals(
  deals: readonly DealDTO[],
  stages: readonly StageLike[],
  now: Date = new Date(),
): CoolingDeal[] {
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const result: CoolingDeal[] = [];
  for (const deal of deals) {
    const stage = byId.get(deal.stage_id);
    if (stage === undefined) continue;
    const info = stallInfo(deal, stage.rotting_days, now);
    if (info !== null) result.push({ ...info, deal, stageName: stage.name });
  }
  return result.sort(
    (a, b) => b.days - b.limit - (a.days - a.limit) || (b.deal.value_cents ?? 0) - (a.deal.value_cents ?? 0),
  );
}

export type CloseRate = { pct: number; won: number; closed: number };

/**
 * Tasa de cierre del período: ganadas de las cerradas (ganadas + perdidas).
 * Sin cierres no hay tasa (`null`): la ficha lo dice en palabras, no con «—».
 * El porcentaje es el del servidor cuando lo trae; si no, se calcula igual.
 */
export function closeRate(stats: Pick<DealStatsDTO, "won_count" | "lost_count" | "win_rate_pct">): CloseRate | null {
  const closed = stats.won_count + stats.lost_count;
  if (closed <= 0) return null;
  const pct = stats.win_rate_pct ?? Math.round((stats.won_count / closed) * 100);
  return { pct, won: stats.won_count, closed };
}

/** «hoy», «1 día», «12 días». */
export function daysLabel(days: number): string {
  if (days <= 0) return "hoy";
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * La fecha de cierre esperada es un DÍA del calendario, no un instante: llega
 * como `2026-09-30T00:00:00Z` y en Bogotá (UTC−5) `new Date()` la pintaba el
 * 29. Se lee solo la parte de la fecha. `withWeekday` → «mar 30 sept».
 */
export function formatCloseDate(iso: string, withWeekday = false): string {
  const day = iso.slice(0, 10);
  const date = new Date(`${day}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("es-CO", withWeekday ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" })
    .replace(/\./g, "")
    .replace(",", "")
    .replace(" de ", " ");
}

/** Posición de una etapa en su pipeline (1-based) para el recorrido del detalle. */
export function stageRoute(
  stages: readonly { id: string; position: number }[],
  stageId: string,
): { index: number; total: number } | null {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const at = ordered.findIndex((stage) => stage.id === stageId);
  return at === -1 ? null : { index: at + 1, total: ordered.length };
}

function payloadString(payload: DealEventDTO["payload"], key: string): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function payloadNumber(payload: DealEventDTO["payload"], key: string): number | null {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * El texto de un evento del historial, legible («Pasó de Calificado a
 * Propuesta», «Valor de $ 7.500.000 a $ 8.900.000»). Lee el payload estándar
 * del servidor; si falta un dato (una etapa borrada, un payload viejo) cae a la
 * etiqueta genérica en vez de inventar.
 */
export function describeDealEvent(
  event: Pick<DealEventDTO, "type" | "payload">,
  stageNames: ReadonlyMap<string, string>,
  currency: string,
): string {
  const { payload } = event;
  switch (event.type) {
    case "stage_changed": {
      const from = stageNames.get(payloadString(payload, "from_stage_id") ?? "");
      const to = stageNames.get(payloadString(payload, "to_stage_id") ?? "");
      if (from !== undefined && to !== undefined) return `Pasó de ${from} a ${to}`;
      if (to !== undefined) return `Pasó a ${to}`;
      return DEAL_EVENT_LABELS.stage_changed;
    }
    case "stage_reverted": {
      const to = stageNames.get(payloadString(payload, "to_stage_id") ?? "");
      return to !== undefined ? `Volvió a ${to}: se deshizo el cambio` : DEAL_EVENT_LABELS.stage_reverted;
    }
    case "value_changed": {
      const from = payloadNumber(payload, "from");
      const to = payloadNumber(payload, "to");
      if (to === null) return DEAL_EVENT_LABELS.value_changed;
      return from === null
        ? `Valor fijado en ${formatMoney(to, currency)}`
        : `Valor de ${formatMoney(from, currency)} a ${formatMoney(to, currency)}`;
    }
    case "stalled": {
      const days = payloadNumber(payload, "stalled_days");
      const limit = payloadNumber(payload, "rotting_days");
      if (days !== null && limit !== null) return `Se enfrió: ${daysLabel(days)} en la etapa, aguanta ${limit}`;
      return "Se enfrió";
    }
    case "owner_changed":
      return "Cambió de responsable";
    case "created":
      return "Se creó la oportunidad";
    default:
      return DEAL_EVENT_LABELS[event.type];
  }
}
