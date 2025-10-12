import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiRbacOverviewPayload, ApiRbacOverviewSummaryPayload, ApiRbacModulesSummaryPayload, CreateRoleDTO, UpdateRoleDTO, CreateModuleDTO, GetRbacOverviewParams } from "@/modules/rbac/domain/overview";

export async function getRbacOverview(params: GetRbacOverviewParams): Promise<ApiResponse<ApiRbacOverviewSummaryPayload>> {
  return http.get<ApiResponse<ApiRbacOverviewSummaryPayload>>("/rbac/overview", params as Params);
}

export async function getRbacOverviewRoleDetail(roleId: number | string): Promise<ApiResponse<ApiRbacOverviewPayload>> {
  return http.get<ApiResponse<ApiRbacOverviewPayload>>("/rbac/overview", { view: "detail", roleId } as Params)
}

export async function listRbacModulesSummary(): Promise<ApiResponse<ApiRbacModulesSummaryPayload>> {
  return http.get<ApiResponse<ApiRbacModulesSummaryPayload>>("/rbac/module", { view: "summary", type: "module"} as Params)
}

export async function createRbacRole(payload: CreateRoleDTO): Promise<ApiResponse<{}>> {
  return http.post<ApiResponse<{}>>("/rbac/role", payload)
}

export async function updateRbacRole(id: number | string, payload: UpdateRoleDTO): Promise<ApiResponse<{}>> {
  return http.put<ApiResponse<{}>>(`/rbac/role/${id}`, payload)
}

export async function deleteRbacRole(id: number | string): Promise<ApiResponse<{}>> {
  return http.delete<ApiResponse<{}>>(`/rbac/role/${id}`)
}

export async function createRbacModule(payload: CreateModuleDTO): Promise<ApiResponse<{}>> {
  return http.post<ApiResponse<{}>>("/rbac/module", payload)
}

export async function listRbacModules(params: Params): Promise<ApiResponse<ApiRbacModulesSummaryPayload>> {
  return http.get<ApiResponse<ApiRbacModulesSummaryPayload>>("/rbac/module", params)
}