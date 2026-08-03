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
