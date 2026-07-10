import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice rbac — roles y permisos (`resource:action`).
 * Los roles system (`owner`, `admin`, `supervisor`, `operator`) son inmutables.
 */
export type RoleDTO = Schemas["RoleListDto"]["data"][number];
export type CreateRoleDTO = Schemas["CreateRoleDto"];
export type UpdateRolePermissionsDTO = Schemas["UpdateRolePermissionsDto"];

export type RoleStatus = RoleDTO["status"];

/** Forma que consume la tabla de roles. */
export type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  status: RoleStatus;
  permissions_count: number;
};
