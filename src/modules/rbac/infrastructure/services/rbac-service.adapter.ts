import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { CreateRoleDTO } from "@/modules/rbac/domain/role";

/**
 * Adapter HTTP del slice rbac → `/rbac/roles` y `/rbac/permissions`.
 * No hay update parcial de rol: los permisos se REEMPLAZAN completos
 * con `PUT /rbac/roles/:id/permissions`.
 */
export function listRoles(): Promise<Schemas["RoleListDto"]> {
  return http.get<Schemas["RoleListDto"]>("/rbac/roles");
}

export function listPermissions(): Promise<Schemas["PermissionListDto"]> {
  return http.get<Schemas["PermissionListDto"]>("/rbac/permissions");
}

export function createRole(dto: CreateRoleDTO): Promise<Schemas["CreatedDto"]> {
  return http.post<Schemas["CreatedDto"]>("/rbac/roles", dto);
}

/** Reemplaza el set completo de permisos del rol (204). */
export function setRolePermissions(roleId: string, permissionCodes: string[]): Promise<void> {
  return http.put<void>(`/rbac/roles/${roleId}/permissions`, { permission_codes: permissionCodes });
}
