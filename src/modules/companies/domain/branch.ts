import type { Schemas } from "@/core/api/types";

/** Sucursales de la empresa (`/companies/me/branches`). Horario propio opcional: vacío = hereda el general. */
export type BranchDTO = Schemas["BranchDto"];
export type CreateBranchDTO = Schemas["CreateBranchDto"];
export type UpdateBranchDTO = Schemas["UpdateBranchDto"];
export type BranchListDTO = Schemas["BranchListDto"];

export function inheritsCompanyHours(branch: Pick<BranchDTO, "schedules">): boolean {
  return branch.schedules.length === 0;
}

/** Principal primero, luego por position y nombre (el mismo orden que el servidor). */
export function sortBranches(branches: readonly BranchDTO[]): BranchDTO[] {
  return [...branches].sort(
    (a, b) => Number(b.is_main) - Number(a.is_main) || a.position - b.position || a.name.localeCompare(b.name),
  );
}

export function hasCoordinates(branch: Pick<BranchDTO, "latitude" | "longitude">): boolean {
  return branch.latitude !== null && branch.longitude !== null;
}

export const BRANCH_ERROR_CODES = {
  nameTaken: "identities/branch_name_taken",
  notFound: "identities/branch_not_found",
} as const;
