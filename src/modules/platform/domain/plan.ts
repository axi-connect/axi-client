/**
 * Dominio de planes comerciales. Todos los tipos derivan del schema OpenAPI.
 *
 * Notas de contrato:
 * - `code` y `tier` son INMUTABLES tras crear (el UpdatePlanDto ni los acepta).
 * - No hay DELETE: retirar un plan = `is_active: false`.
 * - En el PATCH, `default_limits` es REQUERIDO → toda edición reenvía el set.
 * - `PUT /tenants/:id/plan` re-siembra los límites del plan; los `manual` no se tocan.
 * - `PUT /tenants/:id/limits` reemplaza el set completo.
 */
import type { Schemas } from "@/core/api/types";

/** Fila de `GET /platform/plans`. */
export type PlanListItem = Schemas["PlanListDto"]["data"][number];

export type PlanTier = PlanListItem["tier"];

/** Body de `POST /platform/plans`. */
export type CreatePlanDTO = Schemas["CreatePlanDto"];

/** Body de `PATCH /platform/plans/:id` (204). */
export type UpdatePlanDTO = Schemas["UpdatePlanDto"];

/** Respuesta del alta de plan: `{id}`. */
export type CreatedPlan = Schemas["CreatedPlanDto"];

/** `GET /platform/tenants/:id/plan` — plan vigente + límites efectivos con `source`. */
export type TenantPlanView = Schemas["TenantPlanViewDto"];

/** Body de `PUT /platform/tenants/:id/plan` (204). */
export type AssignTenantPlanDTO = Schemas["AssignTenantPlanDto"];

/** Body de `PUT /platform/tenants/:id/limits` (204, reemplaza el set). */
export type ReplaceTenantLimitsDTO = Schemas["ReplaceTenantLimitsDto"];
