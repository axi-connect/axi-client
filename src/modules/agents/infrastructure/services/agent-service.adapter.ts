import { http, Params } from "@/core/services/http";
import type { ApiResponse } from "@/core/services/api";
import type { AgentDetailDTO, ApiAgentSummaryPayload, CreateAgentDTO, ListAgentsParams } from "@/modules/agents/domain/agent";

export async function listAgentSummary(params?: ListAgentsParams): Promise<ApiResponse<ApiAgentSummaryPayload>> {
  return http.get<ApiResponse<ApiAgentSummaryPayload>>("/identities/agents", {...params as Params, view: "summary"}, { authenticate: true });
}

export async function createAgent(payload: CreateAgentDTO): Promise<ApiResponse<AgentDetailDTO>> {
  return http.post<ApiResponse<AgentDetailDTO>>("/identities/agents", payload, { authenticate: true });
}

export async function getAgentById(id: number | string): Promise<ApiResponse<AgentDetailDTO>> {
  return http.get<ApiResponse<AgentDetailDTO>>(`/identities/agents/${id}`, {}, { authenticate: true });
}

export async function updateAgent(id: number | string, payload: Partial<CreateAgentDTO>): Promise<ApiResponse<AgentDetailDTO>> {
  return http.put<ApiResponse<AgentDetailDTO>>(`/identities/agents/${id}`, payload, { authenticate: true });
}

export async function deleteAgent(id: number | string): Promise<ApiResponse<AgentDetailDTO>> {
  return http.delete<ApiResponse<AgentDetailDTO>>(`/identities/agents/${id}`, { authenticate: true });
}