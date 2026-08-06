/**
 * Dominio de límites de uso (compartido por el editor de planes y el tab
 * Plan & Límites del tenant). TypeScript PURO: las invariantes del backend
 * viven aquí para imponerse en la UI ANTES del request (spec §3.3):
 *   · cost caps solo con periodo `billing_cycle`
 *   · máximo 1 cost cap por set
 *   · máximo 30 límites
 *   · sin duplicados (metric, period)
 */
import type { Schemas } from "@/core/api/types";

/** Fila de límite tal como viaja en el wire (sin id — creación/reemplazo). */
export type LimitInput = Schemas["CreatePlanDto"]["default_limits"][number];

/** Límite efectivo del tenant (`GET /tenants/:id/plan`): + id + origen. */
export type EffectiveLimit = Schemas["TenantPlanViewDto"]["limits"][number];

export type LimitMetric = LimitInput["metric"];
export type LimitPeriod = LimitInput["period"];
export type LimitAction = LimitInput["action"];

export const MAX_LIMITS = 30;

/** Formato del `code` de plan (mismo regex del backend). */
export const PLAN_CODE_REGEX = /^[a-z][a-z0-9_]*$/;

/** Unidad de la métrica: decide el formato del valor en la UI. */
export type MetricUnit = "count" | "bytes" | "cost" | "characters";

/** Nota de voz típica (§10.5): la equivalencia hace legible el tope. */
export const CHARS_PER_VOICE_NOTE = 280;

export const METRICS: { value: LimitMetric; label: string; unit: MetricUnit }[] = [
  { value: "ai_tokens_input", label: "Tokens IA (entrada)", unit: "count" },
  { value: "ai_tokens_output", label: "Tokens IA (salida)", unit: "count" },
  { value: "ai_requests", label: "Requests IA", unit: "count" },
  { value: "messages_sent", label: "Mensajes enviados", unit: "count" },
  { value: "messages_received", label: "Mensajes recibidos", unit: "count" },
  { value: "template_sent", label: "Plantillas enviadas", unit: "count" },
  { value: "external_api_calls", label: "Llamadas API externas", unit: "count" },
  { value: "conversations_active", label: "Conversaciones activas", unit: "count" },
  { value: "storage_bytes", label: "Almacenamiento", unit: "bytes" },
  // Voz (§10.5 F3): período recomendado billing_cycle, acción degrade — agotar
  // la voz solo pausa la voz, jamás la IA completa
  { value: "tts_characters", label: "Caracteres de voz", unit: "characters" },
];

export function metricInfo(metric: LimitMetric): { label: string; unit: MetricUnit } {
  return METRICS.find((m) => m.value === metric) ?? { label: metric, unit: "count" };
}

export const PERIODS: { value: LimitPeriod; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "billing_cycle", label: "Ciclo" },
];

export const ACTIONS: { value: LimitAction; label: string }[] = [
  { value: "block", label: "Bloquear" },
  { value: "degrade", label: "Degradar" },
  { value: "notify_only", label: "Solo notificar" },
];

export function periodLabel(period: LimitPeriod): string {
  return PERIODS.find((p) => p.value === period)?.label ?? period;
}

export function actionLabel(action: LimitAction): string {
  return ACTIONS.find((a) => a.value === action)?.label ?? action;
}

/** Fila nueva del editor (defaults del backend: degrade, gracia 0, activa). */
export function newLimitRow(): LimitInput {
  return {
    metric: "ai_requests",
    period: "day",
    limit_value: 1000,
    is_cost_limit: false,
    action: "degrade",
    grace_pct: 0,
    enabled: true,
  };
}

/** Problema de validación anclado a una fila (`row: -1` = del set completo). */
export type LimitIssue = {
  row: number;
  message: string;
};

/** ¿Alguna OTRA fila ya es cost cap? (para deshabilitar el toggle en la UI). */
export function hasOtherCostCap(limits: LimitInput[], exceptRow: number): boolean {
  return limits.some((limit, index) => index !== exceptRow && limit.is_cost_limit);
}

/** Valida el set completo contra las invariantes del backend. */
export function validateLimits(limits: LimitInput[]): LimitIssue[] {
  const issues: LimitIssue[] = [];

  if (limits.length > MAX_LIMITS) {
    issues.push({ row: -1, message: `Máximo ${MAX_LIMITS} límites por set (hay ${limits.length}).` });
  }

  const seen = new Map<string, number>();
  let costCapRow: number | null = null;

  limits.forEach((limit, row) => {
    if (!(limit.limit_value > 0)) {
      issues.push({ row, message: "El valor debe ser mayor que 0." });
    }
    if (limit.grace_pct < 0 || limit.grace_pct > 100) {
      issues.push({ row, message: "La gracia debe estar entre 0 y 100 %." });
    }

    if (limit.is_cost_limit) {
      if (limit.period !== "billing_cycle") {
        issues.push({ row, message: "Un cost cap solo puede medirse por ciclo de facturación." });
      }
      if (costCapRow !== null) {
        issues.push({ row, message: "Solo puede haber un cost cap por set." });
      } else {
        costCapRow = row;
      }
    }

    const key = `${limit.metric}|${limit.period}`;
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      issues.push({
        row,
        message: `Ya existe un límite para (${metricInfo(limit.metric).label}, ${periodLabel(limit.period)}).`,
      });
    } else {
      seen.set(key, row);
    }
  });

  return issues;
}
