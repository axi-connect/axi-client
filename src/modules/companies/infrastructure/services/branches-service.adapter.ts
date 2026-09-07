import { http } from "@/core/services/http";
import type { ReplaceSchedulesDTO } from "@/modules/companies/domain/company";
import type {
  BranchDTO,
  BranchListDTO,
  CreateBranchDTO,
  UpdateBranchDTO,
} from "@/modules/companies/domain/branch";

/** Adapter HTTP de sucursales → `/companies/me/branches`. */
export function listBranches(): Promise<BranchListDTO> {
  return http.get<BranchListDTO>("/companies/me/branches");
}

export function createBranch(dto: CreateBranchDTO): Promise<BranchDTO> {
  return http.post<BranchDTO>("/companies/me/branches", dto);
}

/** PATCH parcial: `null` borra (ciudad, indicaciones, coordenadas). */
export function updateBranch(id: string, dto: UpdateBranchDTO): Promise<BranchDTO> {
  return http.patch<BranchDTO>(`/companies/me/branches/${id}`, dto);
}

/** Reemplaza el horario PROPIO de la sede; lista vacía = vuelve a heredar. 204. */
export function replaceBranchSchedules(id: string, dto: ReplaceSchedulesDTO): Promise<void> {
  return http.put<void>(`/companies/me/branches/${id}/schedules`, dto);
}

/** 204 sin body. */
export function deleteBranch(id: string): Promise<void> {
  return http.delete<void>(`/companies/me/branches/${id}`);
}
