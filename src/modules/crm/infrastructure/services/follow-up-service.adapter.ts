import { http } from "@/core/services/http";
import type { ContactReachabilityDTO } from "@/modules/crm/domain/schedule-follow-up";

/**
 * Qué pasará si el agente le escribe AHORA a un contacto (F2 del seguimiento
 * autónomo). El endpoint vive en conversations —el resolver de rutas es
 * suyo— y refleja al motor: dentro de ventana, fuera con plantilla posible, o
 * sin canal. Alimenta el aviso en vivo del formulario «Programar seguimiento».
 */
/**
 * Reenvía la apertura que Meta rechazó (hotfix plantillas). El recurso es de
 * conversations —el mismo `…/resend` que usa «Reenviar» en el chat—: el
 * servidor crea el mensaje nuevo y re-enlaza la tarea, que vuelve a esperar
 * respuesta.
 */
export function resendOpeningMessage(conversationId: string, messageId: string): Promise<unknown> {
  return http.post<unknown>(`/conversations/${conversationId}/messages/${messageId}/resend`);
}

export function getContactReachability(contactId: string): Promise<ContactReachabilityDTO> {
  return http.get<ContactReachabilityDTO>(`/conversations/contacts/${contactId}/reachability`);
}
