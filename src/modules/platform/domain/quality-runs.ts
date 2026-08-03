/**
 * Dominio de ejecuciones (runs) y cases de calidad. TypeScript PURO: máquina
 * de estados, parseo DEFENSIVO de los Json opacos del backend (`metrics`,
 * `checks`, `timings`, `params` viajan como `unknown` en el DTO), categorías
 * de `failure_reason` y helpers del wizard (presupuesto de estrés, mensajes
 * enriquecidos de los 409/422 de negocio).
 *
 * Terminología de UI: "ejecución/ejecuciones" (nunca "corrida").
 */
import type { Schemas } from "@/core/api/types";

export type RunListItem = Schemas["RunsPageDto"]["data"][number];
export type RunDetail = Schemas["RunDetailDto"];
export type RunCase = Schemas["RunDetailDto"]["cases"][number];
export type CaseDetail = Schemas["CaseDetailDto"];
export type CreateRunDTO = Schemas["CreateRunDto"];

export type RunStatus = RunListItem["status"];
export type RunKind = RunListItem["kind"];
export type RunAiMode = NonNullable<RunListItem["ai_mode"]>;
export type CaseStatus = RunCase["status"];

// ─── Límites y defaults del contrato (quality.config.ts del backend) ────────

/** El DTO acepta 1–16, pero el servidor clampa a este techo (hint en el form). */
export const SERVER_MAX_CONCURRENCY = 8;
export const CONCURRENCY_MIN = 1;
export const CONCURRENCY_MAX = 16;
export const DEFAULT_CONCURRENCY = 4;
export const CONVERSATIONS_MIN = 1;
export const CONVERSATIONS_MAX = 200;
export const TURNS_PER_CONVERSATION_MIN = 1;
export const TURNS_PER_CONVERSATION_MAX = 10;
export const MOCK_LATENCY_MS_MIN = 0;
export const MOCK_LATENCY_MS_MAX = 30_000;
export const DEFAULT_MOCK_LATENCY_MS = 800;
export const SPEND_CAP_USD_MAX = 500;
export const DEFAULT_SPEND_CAP_USD = 5;
/** Presupuesto de ocupación del modo estrés (segundos). */
export const STRESS_BUDGET_S = 3600;
/** Retención de datos sintéticos antes de la purga automática (cron diario). */
export const RUN_RETENTION_DAYS = 14;

// ─── Máquina de estados ─────────────────────────────────────────────────────

/** ¿La ejecución sigue en vuelo? (alimenta el polling de 3 s). */
export function isRunActive(status: RunStatus): boolean {
  return status === "pending" || status === "running" || status === "purging";
}

export function isRunCancelable(status: RunStatus): boolean {
  return status === "pending" || status === "running";
}

/** Purga manual: solo desde terminales con datos (el backend además acepta re-purgar `purging`, idempotente). */
export function isRunPurgeable(status: RunStatus): boolean {
  return status === "completed" || status === "failed" || status === "canceled";
}

/** ¿El case ya quedó asentado? (transcript/veredicto definitivos; corta su polling). */
export function isCaseSettled(status: CaseStatus): boolean {
  return status !== "queued" && status !== "running";
}

// ─── failure_reason (tipado por prefijo/valor exacto) ───────────────────────

/**
 * Categorías: los fallos de instrumento (simulador/escenario), infraestructura
 * (Redis/colas) y contexto (cancelada/suspendido/IA pausada) NO son fallos del
 * agente evaluado — la UI debe distinguirlos visualmente.
 */
export type FailureCategory =
  | "agent"
  | "instrument"
  | "infrastructure"
  | "canceled"
  | "suspended"
  | "ai_paused";

export type FailureReasonInfo = {
  category: FailureCategory;
  /** Etiqueta corta para el badge. */
  label: string;
  tone: "warning" | "destructive" | "neutral";
  /** Texto crudo (tooltip / detalle). */
  detail: string;
};

const EXACT_FAILURE_REASONS: Record<string, Omit<FailureReasonInfo, "detail">> = {
  run_canceled: { category: "canceled", label: "Ejecución cancelada", tone: "neutral" },
  company_suspended: { category: "suspended", label: "Tenant suspendido", tone: "warning" },
  ai_paused: { category: "ai_paused", label: "IA pausada", tone: "warning" },
  scenario_missing: { category: "instrument", label: "Escenario ausente", tone: "warning" },
  simulator_channel_missing: { category: "instrument", label: "Canal simulador ausente", tone: "warning" },
};

export function parseFailureReason(reason: string | null | undefined): FailureReasonInfo | null {
  if (!reason) return null;
  const exact = EXACT_FAILURE_REASONS[reason];
  if (exact) return { ...exact, detail: reason };
  if (reason.startsWith("sim_client_failed:")) {
    return { category: "instrument", label: "Instrumento", tone: "warning", detail: reason };
  }
  if (reason.startsWith("infrastructure_failed:")) {
    return { category: "infrastructure", label: "Infraestructura", tone: "warning", detail: reason };
  }
  // Desconocido → se atribuye al agente mostrando el texto crudo.
  return { category: "agent", label: "Fallo del agente", tone: "destructive", detail: reason };
}

// ─── checks[] del case (Json opaco → CheckResult[]) ─────────────────────────

export type CheckResult = { kind: string; passed: boolean; detail?: string };

/** `kind: "invalid_criteria"` = escenario roto (criterios ilegibles), NO fallo del agente. */
export function isInvalidCriteriaCheck(check: CheckResult): boolean {
  return check.kind === "invalid_criteria";
}

export function parseChecks(raw: unknown): CheckResult[] {
  if (!Array.isArray(raw)) return [];
  const checks: CheckResult[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.kind !== "string" || typeof record.passed !== "boolean") continue;
    checks.push({
      kind: record.kind,
      passed: record.passed,
      ...(typeof record.detail === "string" ? { detail: record.detail } : {}),
    });
  }
  return checks;
}

// ─── metrics del run (Json opaco → RunMetrics) ──────────────────────────────

export type RunMetrics = {
  turns_total: number | null;
  reply_e2e_p50_ms: number | null;
  reply_e2e_p95_ms: number | null;
  replies_observed: number | null;
  duration_ms: number | null;
  conversations_per_min: number | null;
  turns_per_min: number | null;
  /** Solo kind=stress; muestras crudas para la tabla/curva. */
  queue_depth_samples: Record<string, unknown>[];
};

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** `metrics` es null hasta que la ejecución finaliza; cualquier forma rara degrada a null. */
export function parseRunMetrics(raw: unknown): RunMetrics | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  return {
    turns_total: asNumberOrNull(record.turns_total),
    reply_e2e_p50_ms: asNumberOrNull(record.reply_e2e_p50_ms),
    reply_e2e_p95_ms: asNumberOrNull(record.reply_e2e_p95_ms),
    replies_observed: asNumberOrNull(record.replies_observed),
    duration_ms: asNumberOrNull(record.duration_ms),
    conversations_per_min: asNumberOrNull(record.conversations_per_min),
    turns_per_min: asNumberOrNull(record.turns_per_min),
    queue_depth_samples: Array.isArray(record.queue_depth_samples)
      ? record.queue_depth_samples.filter(
          (sample): sample is Record<string, unknown> =>
            typeof sample === "object" && sample !== null && !Array.isArray(sample),
        )
      : [],
  };
}

// ─── params del run (Json opaco → resumen del wizard) ───────────────────────

export type RunParams = {
  concurrency: number | null;
  conversations: number | null;
  turns_per_conversation: number | null;
  mock_latency_ms: number | null;
  spend_cap_usd: number | null;
};

export function parseRunParams(raw: unknown): RunParams {
  const record =
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    concurrency: asNumberOrNull(record.concurrency),
    conversations: asNumberOrNull(record.conversations),
    turns_per_conversation: asNumberOrNull(record.turns_per_conversation),
    mock_latency_ms: asNumberOrNull(record.mock_latency_ms),
    spend_cap_usd: asNumberOrNull(record.spend_cap_usd),
  };
}

// ─── timings[] del case (Json opaco → filas de la tabla) ────────────────────

export type CaseTiming = {
  turn: number;
  injected_at: string | null;
  replied_at: string | null;
  e2e_ms: number | null;
};

export function parseCaseTimings(raw: unknown): CaseTiming[] {
  if (!Array.isArray(raw)) return [];
  const timings: CaseTiming[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.turn !== "number") continue;
    timings.push({
      turn: record.turn,
      injected_at: typeof record.injected_at === "string" ? record.injected_at : null,
      replied_at: typeof record.replied_at === "string" ? record.replied_at : null,
      e2e_ms: asNumberOrNull(record.e2e_ms),
    });
  }
  return timings;
}

// ─── Presupuesto de estrés (validación pre-submit del wizard) ───────────────

/**
 * Ocupación estimada del modo estrés, espejo de `assertStressBudget`:
 * `conversations × turns × max(mock_latency_ms, 800) / 1000` segundos.
 * Si excede `STRESS_BUDGET_S` el backend responde 409 `stress_budget_exceeded`.
 */
export function estimateStressOccupancySeconds(args: {
  conversations: number;
  turnsPerConversation: number;
  mockLatencyMs: number;
}): number {
  const { conversations, turnsPerConversation, mockLatencyMs } = args;
  return (conversations * turnsPerConversation * Math.max(mockLatencyMs, DEFAULT_MOCK_LATENCY_MS)) / 1000;
}

// ─── Mensajes enriquecidos de errores de negocio (lectura defensiva) ────────

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** 409 `quality/tenant_not_eligible` — arma el mensaje según `details.reason`. */
export function describeTenantNotEligible(details: unknown): string {
  const record = asRecord(details);
  switch (record.reason) {
    case "suspended":
      return "El tenant está suspendido: no admite ejecuciones de calidad";
    case "agent_not_active":
      return "El agente seleccionado no está activo. Actívalo o elige otro";
    case "stress_budget_exceeded": {
      const occupancy = asNumberOrNull(record.occupancy_s);
      const budget = asNumberOrNull(record.budget_s) ?? STRESS_BUDGET_S;
      const figures =
        occupancy !== null ? ` (ocupación estimada ${Math.round(occupancy)} s de ${budget} s permitidos)` : "";
      return `La prueba de estrés excede el presupuesto de ocupación${figures}. Reduce conversaciones, turnos o latencia`;
    }
    case "target_is_mock_clone":
      return "Ese agente es un clon interno de QA: elige el agente real del tenant";
    default:
      return "El tenant no es elegible para esta ejecución";
  }
}

/** 422 `quality/spend_cap_exceeded` — cifras del estimado o sugerencia de mock. */
export function describeSpendCapExceeded(details: unknown): string {
  const record = asRecord(details);
  if (record.reason === "no_pricing") {
    return "No hay pricing vigente para el modelo del agente: la ejecución en modo real se rechaza. Usa el modo mock";
  }
  const estimated = asNumberOrNull(record.estimated_usd);
  const cap = asNumberOrNull(record.spend_cap_usd);
  if (estimated !== null && cap !== null) {
    return `El costo estimado (${estimated.toFixed(2)} USD) supera el tope de gasto (${cap.toFixed(2)} USD). Sube el tope o reduce la prueba`;
  }
  return "El tope de gasto no alcanza para la ejecución estimada. Sube el tope o usa el modo mock";
}
