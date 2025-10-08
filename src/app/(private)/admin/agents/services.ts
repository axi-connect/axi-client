import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiAgentSummaryPayload, CreateAgentDTO, ListAgentsParams } from "./model";

export async function listAgentSummary(params?: ListAgentsParams): Promise<ApiResponse<ApiAgentSummaryPayload>> {
  return http.get<ApiResponse<ApiAgentSummaryPayload>>("/identities/agents", {...params as Params, view: "summary"}, { authenticate: true });
}

export async function createAgent(payload: CreateAgentDTO): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>("/identities/agents", payload, { authenticate: true });
}