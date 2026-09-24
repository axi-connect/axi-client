/**
 * Borrador del wizard de ejecución — helpers PUROS. `validateRunConfig`
 * replica las reglas cruzadas del backend que NO viajan en el OpenAPI
 * (`.check()` de zod sobre objeto plano): XOR suite/escenarios en QA,
 * requeridos de estrés y presupuesto de ocupación. El servidor sigue siendo
 * la fuente de verdad (los 400/409/422 se mapean igualmente).
 */
import {
  CONCURRENCY_MAX,
  CONCURRENCY_MIN,
  CONVERSATIONS_MAX,
  CONVERSATIONS_MIN,
  DEFAULT_CONCURRENCY,
  DEFAULT_MOCK_LATENCY_MS,
  DEFAULT_SPEND_CAP_USD,
  estimateStressOccupancySeconds,
  MOCK_LATENCY_MS_MAX,
  MOCK_LATENCY_MS_MIN,
  SPEND_CAP_USD_MAX,
  STRESS_BUDGET_S,
  TURNS_PER_CONVERSATION_MAX,
  TURNS_PER_CONVERSATION_MIN,
  type CreateRunDTO,
  type RunAiMode,
  type RunKind,
} from "../../../../../domain/quality-runs";
import { MAX_SUITE_SCENARIOS } from "../../../../../domain/quality";
import {
  DEFAULT_PROBE_SPEND_CAP_USD,
  PROBE_DEFAULT_K,
  PROBE_K_MAX,
  PROBE_MAX_ITEMS,
  PROBE_SPEND_CAP_MAX,
  probePaysLlm,
  type DatasetKind,
} from "../../../../../domain/quality-datasets";

export type QaScopeMode = "suite" | "scenarios";

export type RunConfigValues = {
  kind: RunKind;
  // QA
  qaMode: QaScopeMode;
  suiteId: string | null;
  scenarioIds: string[];
  concurrency: number;
  // Estrés
  aiMode: RunAiMode;
  conversations: number;
  turnsPerConversation: number;
  mockLatencyMs: number;
  spendCapUsd: number;
  // Probe (F4)
  probeKind: DatasetKind;
  datasetId: string | null;
  k: number;
  /** null = todos los etiquetados (hasta 300) */
  limitItems: number | null;
  probeSpendCapUsd: number;
};

export const defaultRunConfigValues: RunConfigValues = {
  kind: "qa",
  qaMode: "suite",
  suiteId: null,
  scenarioIds: [],
  concurrency: DEFAULT_CONCURRENCY,
  aiMode: "mock",
  conversations: 20,
  turnsPerConversation: 3,
  mockLatencyMs: DEFAULT_MOCK_LATENCY_MS,
  spendCapUsd: DEFAULT_SPEND_CAP_USD,
  probeKind: "catalog_search",
  datasetId: null,
  k: PROBE_DEFAULT_K,
  limitItems: null,
  probeSpendCapUsd: DEFAULT_PROBE_SPEND_CAP_USD,
};

function isInt(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

/** Ocupación estimada del borrador (solo aplica a estrés). */
export function configOccupancySeconds(values: RunConfigValues): number {
  return estimateStressOccupancySeconds({
    conversations: values.conversations,
    turnsPerConversation: values.turnsPerConversation,
    mockLatencyMs: values.mockLatencyMs,
  });
}

/** Reglas espejo del backend; lista de mensajes (vacía = configuración válida). */
export function validateRunConfig(values: RunConfigValues): string[] {
  const errors: string[] = [];

  if (values.kind === "probe") {
    if (!values.datasetId) errors.push("Elige el dataset a probar (con ítems etiquetados)");
    if (!isInt(values.k) || values.k < 1 || values.k > PROBE_K_MAX) {
      errors.push(`k debe ser un entero entre 1 y ${PROBE_K_MAX}`);
    }
    if (values.limitItems !== null && (!isInt(values.limitItems) || values.limitItems < 1 || values.limitItems > PROBE_MAX_ITEMS)) {
      errors.push(`El límite de ítems debe estar entre 1 y ${PROBE_MAX_ITEMS}`);
    }
    if (probePaysLlm(values.probeKind) && (!(values.probeSpendCapUsd > 0) || values.probeSpendCapUsd > PROBE_SPEND_CAP_MAX)) {
      errors.push(`Reconocimiento e intención pagan LLM por ítem: tope de gasto entre 0 y ${PROBE_SPEND_CAP_MAX} USD`);
    }
    return errors;
  }

  if (values.kind === "qa") {
    if (values.qaMode === "suite" && !values.suiteId) {
      errors.push("Elige la suite a ejecutar");
    }
    if (values.qaMode === "scenarios") {
      if (values.scenarioIds.length < 1) errors.push("Elige al menos un escenario");
      if (values.scenarioIds.length > MAX_SUITE_SCENARIOS) {
        errors.push(`Máximo ${MAX_SUITE_SCENARIOS} escenarios por ejecución`);
      }
    }
    if (!isInt(values.concurrency) || values.concurrency < CONCURRENCY_MIN || values.concurrency > CONCURRENCY_MAX) {
      errors.push(`La concurrencia debe ser un entero entre ${CONCURRENCY_MIN} y ${CONCURRENCY_MAX}`);
    }
  } else {
    if (!isInt(values.conversations) || values.conversations < CONVERSATIONS_MIN || values.conversations > CONVERSATIONS_MAX) {
      errors.push(`Conversaciones: entero entre ${CONVERSATIONS_MIN} y ${CONVERSATIONS_MAX}`);
    }
    if (
      !isInt(values.turnsPerConversation) ||
      values.turnsPerConversation < TURNS_PER_CONVERSATION_MIN ||
      values.turnsPerConversation > TURNS_PER_CONVERSATION_MAX
    ) {
      errors.push(`Turnos por conversación: entero entre ${TURNS_PER_CONVERSATION_MIN} y ${TURNS_PER_CONVERSATION_MAX}`);
    }
    if (
      !isInt(values.mockLatencyMs) ||
      values.mockLatencyMs < MOCK_LATENCY_MS_MIN ||
      values.mockLatencyMs > MOCK_LATENCY_MS_MAX
    ) {
      errors.push(`Latencia mock: entero entre ${MOCK_LATENCY_MS_MIN} y ${MOCK_LATENCY_MS_MAX} ms`);
    }
    if (values.aiMode === "real" && (!(values.spendCapUsd > 0) || values.spendCapUsd > SPEND_CAP_USD_MAX)) {
      errors.push(`El tope de gasto debe ser mayor a 0 y hasta ${SPEND_CAP_USD_MAX} USD`);
    }
    const occupancy = configOccupancySeconds(values);
    if (occupancy > STRESS_BUDGET_S) {
      errors.push(
        `La prueba excede el presupuesto de ocupación (${Math.round(occupancy)} s de ${STRESS_BUDGET_S} s): reduce conversaciones, turnos o latencia`,
      );
    }
  }

  return errors;
}

/** Arma el body del POST /runs (solo viajan los campos del kind elegido). */
export function buildCreateRunDTO(args: {
  companyId: string;
  /** null solo en probe (no tiene agente objetivo) */
  agentId: string | null;
  config: RunConfigValues;
}): CreateRunDTO {
  const { companyId, agentId, config } = args;
  if (config.kind === "probe") {
    return {
      company_id: companyId,
      kind: "probe",
      probe_kind: config.probeKind,
      dataset_id: config.datasetId ?? "",
      k: config.k,
      ...(config.limitItems === null ? {} : { limit_items: config.limitItems }),
      ...(probePaysLlm(config.probeKind) ? { spend_cap_usd: config.probeSpendCapUsd } : {}),
    };
  }
  if (config.kind === "qa") {
    return {
      company_id: companyId,
      kind: "qa",
      agent_id: agentId ?? "",
      ...(config.qaMode === "suite"
        ? { suite_id: config.suiteId! }
        : { scenario_ids: config.scenarioIds }),
      concurrency: config.concurrency,
    };
  }
  return {
    company_id: companyId,
    kind: "stress",
    agent_id: agentId ?? "",
    ai_mode: config.aiMode,
    conversations: config.conversations,
    turns_per_conversation: config.turnsPerConversation,
    mock_latency_ms: config.mockLatencyMs,
    ...(config.aiMode === "real" ? { spend_cap_usd: config.spendCapUsd } : {}),
  };
}
