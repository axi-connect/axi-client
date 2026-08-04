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
