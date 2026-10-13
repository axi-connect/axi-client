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
  { value: "ai_conversations", label: "Conversaciones con IA", unit: "count" },
  { value: "call_seconds", label: "Segundos de llamada", unit: "count" },
  { value: "cmo_analyses", label: "Análisis de Axel", unit: "count" },
  { value: "lead_discoveries", label: "Leads descubiertos", unit: "count" },
  { value: "lead_enrichments", label: "Leads enriquecidos", unit: "count" },
  { value: "product_recognitions", label: "Reconocimientos de producto", unit: "count" },
  { value: "emails_sent", label: "Correos enviados", unit: "count" },
  { value: "sms_sent", label: "SMS enviados", unit: "count" },
  // Voz (§10.5 F3): período recomendado billing_cycle, acción degrade — agotar
  // la voz solo pausa la voz, jamás la IA completa
  { value: "tts_characters", label: "Caracteres de voz", unit: "characters" },
  // P1b: decisiones del motor. Agotarlas solo pausa los clasificadores; cada
  // consumidor sigue con su heurística.
  { value: "ai_decisions", label: "Clasificadores", unit: "count" },
];

export function metricInfo(metric: LimitMetric): { label: string; unit: MetricUnit } {
  if (metric === STORAGE_METRIC) return { label: "Ingesta de archivos", unit: "bytes" };
  return METRICS.find((m) => m.value === metric) ?? { label: metric, unit: "count" };
}

/**
 * `storage_bytes` es el CAUDAL de archivos subidos en el ciclo, no el espacio
 * ocupado: no se ofrece como límite (el backend lo rechaza). El espacio se fija
 * como «Almacenamiento incluido» del plan o cuota del tenant.
 */
export const STORAGE_METRIC = "storage_bytes" satisfies LimitMetric;

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
    // 0 es legítimo: «sin cuota» (el trial nace con call_seconds = 0).
    if (!(limit.limit_value >= 0)) {
      issues.push({ row, message: "El valor no puede ser negativo." });
    }
    if (limit.metric === STORAGE_METRIC) {
      issues.push({
        row,
        message: "El almacenamiento no es un límite de consumo: fíjalo como almacenamiento incluido del plan.",
      });
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
