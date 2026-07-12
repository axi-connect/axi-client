import { http } from "@/core/services/http";
import type { OrderNotificationSettingsDTO } from "@/modules/orders/domain/order";

/**
 * Plantillas de notificación al cliente (F11). El GET devuelve SIEMPRE las 5
 * claves (con defaults sugeridos si el tenant nunca configuró); el PUT
 * reemplaza el set completo.
 */
export function getOrderNotificationSettings(): Promise<OrderNotificationSettingsDTO> {
  return http.get<OrderNotificationSettingsDTO>("/orders/notification-settings");
}

export function updateOrderNotificationSettings(
  dto: OrderNotificationSettingsDTO,
): Promise<OrderNotificationSettingsDTO> {
  return http.put<OrderNotificationSettingsDTO>("/orders/notification-settings", dto);
}
