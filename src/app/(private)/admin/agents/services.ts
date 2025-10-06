import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiAgentsPayload, ListAgentsParams } from "./model";

export async function listAgents(params: ListAgentsParams): Promise<ApiResponse<ApiAgentsPayload>> {
  return http.get<ApiResponse<ApiAgentsPayload>>("/identities/agents", params as Params, { authenticate: true });
}