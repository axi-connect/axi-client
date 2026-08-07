import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice agents — agentes de IA del tenant (`/ai-agents`).
 * Un agente es una configuración LLM: prompt, proveedor/modelo, character,
 * intenciones asignadas y política de handoff a humanos.
 */
export type AiAgentDTO = Schemas["AiAgentDto"];
export type AiAgentListItemDTO = Schemas["AiAgentListDto"]["data"][number];
export type CreateAiAgentDTO = Schemas["CreateAiAgentDto"];
export type UpdateAiAgentDTO = Schemas["UpdateAiAgentDto"];
export type SetAgentIntentionsDTO = Schemas["SetAgentIntentionsDto"];

export type AgentStatus = AiAgentDTO["status"];
export type AiProvider = AiAgentDTO["provider"];
export type AgentIntentionAssignment = AiAgentDTO["intentions"][number];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  draft: "Borrador",
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  openai_compatible: "OpenAI compatible",
  anthropic: "Anthropic",
  // Uso interno del módulo quality (QA simulado): jamás se ofrece en el form
  mock: "Mock (QA interno)",
};

/** Proveedor asignable desde el panel: `mock` es interno de quality y el
 * backend lo rechaza, así que el selector del formulario NO debe ofrecerlo
 * (los labels de arriba sí lo tienen: tabla y detalle deben poder mostrarlo). */
export type AssignableAiProvider = Exclude<AiProvider, "mock">;

export const ASSIGNABLE_AI_PROVIDERS: AssignableAiProvider[] = [
  "openai_compatible",
  "anthropic",
];

/**
 * Modelo del catálogo (`GET /ai-agents/models`). El catálogo son las tarifas
 * vigentes del panel de plataforma: un modelo sin precio no es elegible,
 * porque su consumo se mediría sin costo y el tope de gasto quedaría ciego.
 */
export type AiModelDTO = Schemas["AiModelListDto"]["data"][number];

/**
 * `agent.voice_policy` (§10.5): CUÁNDO habla. El schema del backend es STRICT
 * (una clave desconocida es 400, jamás un apagado silencioso), así que el form
 * envía EXACTAMENTE estas claves. `mode: "mirror"` es el único valor hoy: el
 * agente responde con voz solo si el cliente usó voz en ese turno.
 */
export type AgentVoicePolicy = {
  enabled: boolean;
  mode: "mirror";
  max_per_conversation?: number;
  max_chars?: number;
};

export const VOICE_POLICY_LIMITS = {
  max_per_conversation: { min: 1, max: 20, fallback: 6 },
  max_chars: { min: 1, max: 2000 },
} as const;

/** Lectura tolerante del JSON de la vista (la escritura es estricta). */
export function agentVoicePolicy(raw: AiAgentDTO["voice_policy"] | null | undefined): {
  enabled: boolean;
  max_per_conversation?: number;
  max_chars?: number;
} {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    ...(typeof value.max_per_conversation === "number"
      ? { max_per_conversation: value.max_per_conversation }
      : {}),
    ...(typeof value.max_chars === "number" ? { max_chars: value.max_chars } : {}),
  };
}

/** Forma que consume la tabla de agentes. */
export type AgentRow = {
  id: string;
  name: string;
  status: AgentStatus;
  provider: AiProvider;
  model: string;
  character_id: string | null;
  intentions_count: number;
};
