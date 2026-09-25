import { http } from "@/core/services/http";
import type { DealDTO } from "@/modules/crm/domain/deal";
import type { ContactJourneyDTO, JourneyDTO, PutJourneyDTO } from "@/modules/crm/domain/journey";

/**
 * Adapter HTTP del recorrido del cliente (F4 «Método comercial»).
 *
 * Leer el recorrido (`GET /crm/journey`) y la ficha del contacto
 * (`/crm/contacts/:id/journey`) piden `crm:read`; escribirlo (`PUT`,
 * `apply-template`) y deshacer un movimiento piden `crm:manage` (es una
 * escritura sobre el pipeline o la oportunidad con rastro auditado); reanudar
 * la IA es el PATCH normal del deal (`crm:read`).
 */

/** Etapas del pipeline por defecto con tipo, cadencia y las plantillas por nicho. */
export function getJourney(): Promise<JourneyDTO> {
  return http.get<JourneyDTO>("/crm/journey");
}

/**
 * Acepta una lista PARCIAL de etapas: el editor manda solo la que cambió.
 * 409 `crm/stage_kind_taken` si dos etapas piden el mismo tipo (salvo «Personalizada»).
 */
export function putJourney(dto: PutJourneyDTO): Promise<JourneyDTO> {
  return http.put<JourneyDTO>("/crm/journey", dto);
}

/** Reemplaza tipos y cadencias por los de la plantilla. No borra etapas ni oportunidades. */
export function applyJourneyTemplate(nicheCode: string): Promise<JourneyDTO> {
  return http.post<JourneyDTO>("/crm/journey/apply-template", { niche_code: nicheCode });
}

/** Deal abierto del contacto con su etapa, último movimiento y cadencia en curso. */
export function getContactJourney(contactId: string): Promise<ContactJourneyDTO> {
  return http.get<ContactJourneyDTO>(`/crm/contacts/${contactId}/journey`);
}

/**
 * Deshace un `stage_changed`: vuelve a la etapa de origen, registra
 * `stage_reverted` y, si lo había movido la IA, pausa sus movimientos.
 * 409 `crm/stage_change_not_revertible` si ya no se puede.
 */
export function revertStageChange(dealId: string, eventId: string, reason?: string): Promise<void> {
  return http.post<void>(`/crm/deals/${dealId}/events/${eventId}/revert`, { reason });
}

/** Quita la pausa que dejó un «Deshacer» sobre un movimiento del agente. */
export function resumeAiMoves(dealId: string): Promise<DealDTO> {
  return http.patch<DealDTO>(`/crm/deals/${dealId}`, { ai_moves_paused: false });
}
