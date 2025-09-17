import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiRbacOverviewPayload, ApiRbacOverviewSummaryPayload, GetRbacOverviewParams } from "./model";

export async function getRbacOverview(params: GetRbacOverviewParams): Promise<ApiResponse<ApiRbacOverviewSummaryPayload>> {
  return http.get<ApiResponse<ApiRbacOverviewSummaryPayload>>("/rbac/overview", params as Params);
}

export async function getRbacOverviewRoleDetail(roleId: number | string): Promise<ApiResponse<ApiRbacOverviewPayload>> {
  return http.get<ApiResponse<ApiRbacOverviewPayload>>("/rbac/overview", { view: "detail", roleId } as Params)
}