import type { Schemas } from "@/core/api/types"
import type { NotificationCreatedEvent } from "@/core/realtime/events"

/**
 * Contratos del slice notifications. El wire viene 1:1 del backend
 * (`GET /api/v1/notifications`); `type` es string libre (sin enum) y `data`
 * es el payload del evento de dominio que originó la notificación.
 */
export type NotificationsListDTO = Schemas["NotificationsListDto"]
export type NotificationDTO = NotificationsListDTO["data"][number]

export type ListNotificationsParams = {
  unread_only?: boolean
  page?: number
  page_size?: number
}

/** El push WS no trae `read_at`: una notificación recién creada nunca está leída. */
export function fromRealtimeEvent(evt: NotificationCreatedEvent): NotificationDTO {
  return { ...evt, read_at: null }
}
