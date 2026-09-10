import { localDayKey } from "@/core/lib/day-label"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

export interface DayGroup {
  /** `YYYY-MM-DD` local: clave ESTABLE (la etiqueta «Hoy» cambia a medianoche, la clave no). */
  key: string
  items: UiMessage[]
}

/**
 * Agrupa el hilo por día local en una pasada. La entrada ya viene ordenada por
 * `created_at` (invariante del store), así que los grupos salen en orden y sin
 * repetir claves. Un mensaje con fecha inválida cae en el grupo anterior para
 * no abrir un separador vacío.
 */
export function groupMessagesByDay(messages: readonly UiMessage[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const message of messages) {
    const key = localDayKey(message.created_at) || groups[groups.length - 1]?.key || "unknown"
    const last = groups[groups.length - 1]
    if (last !== undefined && last.key === key) last.items.push(message)
    else groups.push({ key, items: [message] })
  }
  return groups
}
