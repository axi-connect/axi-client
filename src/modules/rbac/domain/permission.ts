import type { Schemas } from "@/core/api/types";

/** Permiso del catálogo global (`code = resource:action`). */
export type PermissionDTO = Schemas["PermissionListDto"]["data"][number];

/** Agrupa el catálogo por `resource` para pintar la matriz de permisos. */
export function groupPermissionsByResource(
  permissions: PermissionDTO[],
): Array<{ resource: string; permissions: PermissionDTO[] }> {
  const groups = new Map<string, PermissionDTO[]>();
  for (const permission of permissions) {
    const list = groups.get(permission.resource) ?? [];
    list.push(permission);
    groups.set(permission.resource, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, list]) => ({
      resource,
      permissions: [...list].sort((a, b) => a.action.localeCompare(b.action)),
    }));
}
