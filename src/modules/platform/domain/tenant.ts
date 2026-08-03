/**
 * Dominio de tenants del panel de plataforma. Todos los tipos derivan del
 * schema OpenAPI generado (contratos primero, cero interfaces duplicadas).
 *
 * Nota de contrato: NO existe `GET /platform/tenants/:id` — el detalle se
 * deriva de la caché de la lista (`useTenantQuery` hace `find` sobre ella).
 */
import type { Schemas } from "@/core/api/types";

/** Fila de `GET /platform/tenants` (lista completa, sin paginación server). */
export type TenantListItem = Schemas["TenantListDto"]["data"][number];

export type TenantStatus = TenantListItem["status"];

/** Body de `POST /platform/tenants` (empresa + owner + plan opcional). */
export type CreateTenantDTO = Schemas["CreateTenantDto"];

/** Respuesta del alta: `{id, owner_user_id}`. */
export type CreatedTenant = Schemas["CreatedTenantDto"];

/** Body de `PATCH /platform/tenants/:id` (204; suspender bloquea el login del tenant). */
export type UpdateTenantDTO = Schemas["UpdateTenantDto"];

/** Body de `POST /platform/tenants/:id/trial` (asignar/extender prueba). */
export type StartTrialDTO = Schemas["StartTrialDto"];

/** Respuesta del trial: `{trial_ends_at}` para mostrar la fecha sin re-fetch. */
export type TrialStarted = Schemas["TrialStartedDto"];

/**
 * ¿El tenant admite iniciar/extender un trial? Espejo de la validación del
 * backend (`platform/trial_not_allowed`): una suspensión manual no se
 * puentea con un trial — solo la causada por el propio vencimiento.
 */
export function canStartTrial(tenant: Pick<TenantListItem, "status" | "status_reason">): boolean {
  return tenant.status !== "suspended" || tenant.status_reason === "trial_expired";
}

/** Fila de `GET /platform/tenants/:id/users` (read-only, sin acciones). */
export type TenantUser = Schemas["TenantUsersDto"]["data"][number];

/**
 * Clave de `sessionStorage` con las credenciales del owner recién creado.
 * Vida efímera: el banner del detalle las lee UNA vez y las borra
 * ("se muestran una sola vez" — nunca persisten más allá de ese render).
 */
export const PENDING_CREDENTIALS_KEY = "axi.platform.pending_credentials";

export type PendingOwnerCredentials = {
  tenant_id: string;
  email: string;
  password: string;
};
