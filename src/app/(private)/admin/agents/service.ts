import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { AgentDetailDTO, ApiAgentSummaryPayload, CreateAgentDTO, ListAgentsParams } from "./model";

export async function listAgentSummary(params?: ListAgentsParams): Promise<ApiResponse<ApiAgentSummaryPayload>> {
  return http.get<ApiResponse<ApiAgentSummaryPayload>>("/identities/agents", {...params as Params, view: "summary"}, { authenticate: true });
}

export async function createAgent(payload: CreateAgentDTO): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>("/identities/agents", payload, { authenticate: true });
}

export async function getAgentById(id: number | string): Promise<ApiResponse<AgentDetailDTO>> {
  return http.get<ApiResponse<AgentDetailDTO>>(`/identities/agents/${id}`, {}, { authenticate: true });
}

export async function updateAgent(id: number | string, payload: Partial<CreateAgentDTO>): Promise<ApiResponse<any>> {
  return http.put<ApiResponse<any>>(`/identities/agents/${id}`, payload, { authenticate: true });
}