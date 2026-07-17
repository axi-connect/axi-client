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
