import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  AiAgentDTO,
  CreateAiAgentDTO,
  SetAgentIntentionsDTO,
  UpdateAiAgentDTO,
} from "@/modules/agents/domain/agent";

/** Adapter HTTP del slice agents → `/ai-agents`. */
export function listAgents(): Promise<Schemas["AiAgentListDto"]> {
  return http.get<Schemas["AiAgentListDto"]>("/ai-agents");
}

/**
 * Catálogo de modelos elegibles. El backend lo deriva de las tarifas vigentes:
 * un modelo sin precio no aparece aquí y el CRUD lo rechaza.
 */
export function listAiModels(): Promise<Schemas["AiModelListDto"]> {
  return http.get<Schemas["AiModelListDto"]>("/ai-agents/models");
}

export function getAgentById(id: string): Promise<AiAgentDTO> {
  return http.get<AiAgentDTO>(`/ai-agents/${id}`);
}

export function createAgent(dto: CreateAiAgentDTO): Promise<AiAgentDTO> {
  return http.post<AiAgentDTO>("/ai-agents", dto);
}

export function updateAgent(id: string, dto: UpdateAiAgentDTO): Promise<AiAgentDTO> {
  return http.patch<AiAgentDTO>(`/ai-agents/${id}`, dto);
}

export function deleteAgent(id: string): Promise<void> {
  return http.delete(`/ai-agents/${id}`);
}

/** Reemplaza el set completo de intenciones asignadas (con requirements). */
export function setAgentIntentions(id: string, dto: SetAgentIntentionsDTO): Promise<AiAgentDTO> {
  return http.put<AiAgentDTO>(`/ai-agents/${id}/intentions`, dto);
}
