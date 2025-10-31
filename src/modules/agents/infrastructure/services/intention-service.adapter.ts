import { http, Params } from "@/core/services/http";
import type { ApiResponse } from "@/core/services/api";
import type { TreeNode } from "@/shared/components/features/tree-view";
import type { ListIntentionParams, ApiIntentionPayload } from "@/modules/agents/domain/intentions";

export async function listIntention(params: ListIntentionParams): Promise<ApiResponse<ApiIntentionPayload>> {
  return http.get<ApiResponse<ApiIntentionPayload>>("/parameters/intention", params as Params, { authenticate: true });
}

export async function listIntentionOverview(): Promise<ApiResponse<TreeNode[]>> {
  return http.get<ApiResponse<TreeNode[]>>("/parameters/intention/overview", {}, { authenticate: true });
}