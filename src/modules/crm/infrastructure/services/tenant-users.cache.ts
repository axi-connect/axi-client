import {
  listAssignableUsers,
  type AssignableUser,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";

/**
 * Caché de los usuarios del tenant a nivel de módulo.
 *
 * `/users` no acepta filtros ni paginación y varios consumidores lo necesitan a
 * la vez (el hook de contexto para resolver el nombre del responsable, el
 * selector de responsable para su lista). Se pide **una vez por sesión** en
 * lugar de una por apertura de panel o de popover.
 *
 * Se cachea la PROMESA, no el resultado: dos consumidores que monten en el mismo
 * tick comparten la petición en vuelo. Un fallo no se cachea — el siguiente
 * consumidor reintenta.
 */

let usersPromise: Promise<AssignableUser[]> | null = null;

/** Usuarios activos del tenant (los `invited`/`disabled` no son asignables). */
export function getTenantUsers(): Promise<AssignableUser[]> {
  usersPromise ??= listAssignableUsers()
    .then((users) => users.filter((user) => user.status === "active"))
    .catch((error: unknown) => {
      usersPromise = null;
      throw error;
    });
  return usersPromise;
}

/**
 * Mapa `id → nombre` para hidratar los uuid crudos que devuelven los DTO
 * (`owner_user_id`, `assigned_user_id`, `actor_user_id`…). Degrada a un mapa
 * vacío: no poder resolver un nombre nunca debe romper la vista que lo pinta.
 */
export function getTenantUserNames(): Promise<Map<string, string>> {
  return getTenantUsers()
    .then((users) => new Map(users.map((user) => [user.id, user.name])))
    .catch(() => new Map<string, string>());
}

/** Solo para tests: descarta la caché compartida. */
export function clearTenantUsersCache(): void {
  usersPromise = null;
}
