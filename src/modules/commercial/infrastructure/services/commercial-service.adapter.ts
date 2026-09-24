import { http } from "@/core/services/http";
import type {
  CommercialApprovalResultDTO,
  CommercialPaceDTO,
  CommercialProposalDetailDTO,
  CommercialProposalDTO,
  CommercialProposalListDTO,
  CommercialProposalStatus,
  CommercialPlanDTO,
  GoalInputDTO,
  GoalResponseWireDTO,
  PaceGranularity,
  RejectCommercialProposalDTO,
  RejectCommercialProposalResultDTO,
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

/**
 * Fijar o cambiar la meta del mes en curso (a mitad de mes se recalcula desde hoy).
 * Responde la MISMA vista que el GET (`{ goal, seed }`, `GoalResponseDto` en el
 * contrato), no la meta sola: tratarla como la meta dejaba la cabecera vacía
 * hasta recargar (Q1).
 */
export function putGoal(input: GoalInputDTO): Promise<GoalResponseWireDTO> {
  return http.put<GoalResponseWireDTO>("/commercial/goal", input);
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

/*
 * «Axi propone» (F6). Lo sirve un controller del módulo cmo bajo el prefijo
 * `commercial/proposals` (capacidad `crm`, permisos `commercial:read` y
 * `commercial:approve`): solo `source='commercial'`; una propuesta de Axel
 * pedida por aquí es un 404. Aprobar y rechazar pasan por los MISMOS casos de
 * uso que /cmo.
 */

/** Sin `status` el servidor devuelve las pendientes (hasta 20). */
export async function listProposals(status: CommercialProposalStatus = "pending"): Promise<CommercialProposalDTO[]> {
  const response = await http.get<CommercialProposalListDTO>("/commercial/proposals", { status });
  return response.data;
}

export async function getProposal(id: string): Promise<CommercialProposalDTO> {
  const response = await http.get<CommercialProposalDetailDTO>(`/commercial/proposals/${encodeURIComponent(id)}`);
  return response.data;
}

/** Una sola vez: el segundo clic es un 409 del servidor (la transición es atómica). */
export function approveProposal(id: string): Promise<CommercialApprovalResultDTO> {
  return http.post<CommercialApprovalResultDTO>(`/commercial/proposals/${encodeURIComponent(id)}/approve`);
}

export function rejectProposal(id: string, body: RejectCommercialProposalDTO): Promise<RejectCommercialProposalResultDTO> {
  return http.post<RejectCommercialProposalResultDTO>(`/commercial/proposals/${encodeURIComponent(id)}/reject`, body);
}
