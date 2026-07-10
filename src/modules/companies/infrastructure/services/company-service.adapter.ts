import { http } from "@/core/services/http";
import type {
  CompanyDTO,
  ReplaceSchedulesDTO,
  UpdateCompanyDTO,
} from "@/modules/companies/domain/company";

/** Adapter HTTP del slice companies → `/companies/me`. */
export function getMyCompany(): Promise<CompanyDTO> {
  return http.get<CompanyDTO>("/companies/me");
}

/** PATCH parcial; responde 204 (sin body). */
export function updateMyCompany(dto: UpdateCompanyDTO): Promise<void> {
  return http.patch<void>("/companies/me", dto);
}

/** Reemplaza el horario de atención completo (weekday 0-6, HH:mm); 204. */
export function replaceSchedules(dto: ReplaceSchedulesDTO): Promise<void> {
  return http.put<void>("/companies/me/schedules", dto);
}
