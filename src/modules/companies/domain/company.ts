import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice companies — la empresa del tenant autenticado
 * (`/companies/me`). No hay listado: el tenant se deriva del token.
 */
export type CompanyDTO = Schemas["CompanyDto"];
export type UpdateCompanyDTO = Schemas["UpdateCompanyDto"];
export type ReplaceSchedulesDTO = Schemas["ReplaceSchedulesDto"];

export type CompanySchedule = CompanyDTO["schedules"][number];
export type ScheduleInput = ReplaceSchedulesDTO["schedules"][number];

export type CompanyStatus = CompanyDTO["status"];

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
