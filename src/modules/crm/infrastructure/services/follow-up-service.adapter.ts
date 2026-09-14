import { http } from "@/core/services/http";
import type { ContactReachabilityDTO } from "@/modules/crm/domain/schedule-follow-up";

/**
 * Qué pasará si el agente le escribe AHORA a un contacto (F2 del seguimiento
 * autónomo). El endpoint vive en conversations —el resolver de rutas es
 * suyo— y refleja al motor: dentro de ventana, fuera con plantilla posible, o
 * sin canal. Alimenta el aviso en vivo del formulario «Programar seguimiento».
 */
export function getContactReachability(contactId: string): Promise<ContactReachabilityDTO> {
  return http.get<ContactReachabilityDTO>(`/conversations/contacts/${contactId}/reachability`);
}
