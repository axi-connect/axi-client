import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { TreeNode } from "@/components/features/tree-view";
import type { ListIntentionParams, ApiIntentionPayload } from "@/app/(private)/admin/agents/intentions/model";

export async function listIntention(params: ListIntentionParams): Promise<ApiResponse<ApiIntentionPayload>> {
  return http.get<ApiResponse<ApiIntentionPayload>>("/parameters/intention", params as Params, { authenticate: true });
}

export async function listIntentionOverview(): Promise<ApiResponse<TreeNode[]>> {
  return http.get<ApiResponse<TreeNode[]>>("/parameters/intention/overview", {}, { authenticate: true });
}