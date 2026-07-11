import { http } from "@/core/services/http"
import type {
  ListNotificationsParams,
  NotificationsListDTO,
} from "@/modules/notifications/domain/notification"

/**
 * Adapter REST del slice notifications (`/api/v1/notifications`).
 * Solo requiere sesión (sin permiso RBAC extra): el backend scopa por
 * el `user_id` del token.
 */

export function listNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationsListDTO> {
  // El backend valida `unread_only` como string-bool ("true"/"false"), no boolean.
  return http.get<NotificationsListDTO>("/notifications", {
    unread_only: params.unread_only === undefined ? undefined : String(params.unread_only),
    page: params.page,
    page_size: params.page_size,
  })
}

/** 204. Idempotente en el backend; 404 si no existe o no es del usuario. */
export function markNotificationRead(id: string): Promise<void> {
  return http.post<void>(`/notifications/${id}/read`)
}

/** 204. Marca todas las no leídas del usuario. */
export function markAllNotificationsRead(): Promise<void> {
  return http.post<void>("/notifications/read-all")
}
