import { http } from "@/core/services/http";
import type {
  CommercialGoalDTO,
  CommercialPaceDTO,
  CommercialPlanDTO,
  GoalInputDTO,
  GoalResponseWireDTO,
  PaceGranularity,
} from "@/modules/commercial/domain/commercial";

/**
 * Adapter HTTP del módulo Comercial (`/commercial/*`). Capacidad `crm`,
 * permisos `commercial:read` (leer) y `commercial:manage` (fijar la meta).
 *
 * Dos formas del contrato que condicionan a los consumidores:
 *
 *  - **`GET /commercial/goal` nunca da 404 por no tener meta**: devuelve
 *    `{ goal: null, seed }`. Un mes sin meta es el estado normal del primer día,
 *    no un error, y la semilla es justo lo que el vacío necesita para proponer.
 *  - **`GET /commercial/pace` nunca calcula en caliente**: lee el rollup y el
 *    plan; si la fila de hoy tiene más de 10 min encola el refresco y responde
 *    `stale: true`. La pantalla pinta lo que hay y el WS (F8) trae lo nuevo.
 *    Sin meta responde 404 `commercial/goal_not_found`: se pide solo con meta.
 */

export function getGoal(): Promise<GoalResponseWireDTO> {
  return http.get<GoalResponseWireDTO>("/commercial/goal");
}

/** Fijar o cambiar la meta del mes en curso (a mitad de mes se recalcula desde hoy). */
export function putGoal(input: GoalInputDTO): Promise<CommercialGoalDTO> {
  return http.put<CommercialGoalDTO>("/commercial/goal", input);
}

/** El plan vigente, o `null` si el periodo no tiene meta (200, no 404). */
export function getPlan(): Promise<CommercialPlanDTO | null> {
  return http.get<CommercialPlanDTO | null>("/commercial/plan");
}

/**
 * «Lo que implica» una meta ANTES de guardarla: el embudo al revés calculado al
 * vuelo sobre la historia real del tenant (el endpoint del spike de F2). Se
 * llama al teclear, así que el `signal` no es opcional de facto: sin abortar,
 * una respuesta lenta pisaría a la de la cifra que el usuario ya cambió.
 */
export function previewPlan(input: GoalInputDTO, signal?: AbortSignal): Promise<CommercialPlanDTO> {
  return http.get<CommercialPlanDTO>(
    "/commercial/plan/preview",
    {
      target_cents: input.target_revenue_cents,
      avg_ticket_cents: input.declared_avg_ticket_cents ?? undefined,
      close_rate_pct: input.declared_close_rate_pct ?? undefined,
    },
    { signal },
  );
}

export function getPace(granularity: PaceGranularity = "day"): Promise<CommercialPaceDTO> {
  return http.get<CommercialPaceDTO>("/commercial/pace", { granularity });
}
