import { sentFromBusinessApp, type UiMessage } from "@/modules/inbox/domain/inbox"
import type { EventLine } from "@/modules/inbox/domain/conversation-events"

/**
 * El hilo de la conversación (F2): mensajes y eventos de handoff intercalados
 * por hora, agrupados por día y con los mensajes seguidos del mismo autor
 * juntos (la hora va solo en el último del grupo).
 *
 * Puro: el día lo decide `dayKey`, que la UI arma con la zona del negocio.
 * Con eso los tests prueban la medianoche por los dos lados.
 */

export type TimelineItem =
  | { kind: "message"; key: string; message: UiMessage; first: boolean; last: boolean }
  | { kind: "event"; key: string; line: EventLine }

export interface TimelineDay {
  /** `YYYY-MM-DD` estable: la etiqueta («Hoy» → «Ayer») cambia, la clave no. */
  key: string
  items: TimelineItem[]
}

/** Mensajes del mismo autor a menos de esto se agrupan. */
export const GROUP_GAP_MS = 5 * 60_000

/** Quién escribió, para agrupar: dirección, tipo de autor, persona y si salió del celular. */
export function authorKey(message: UiMessage): string {
  return [
    message.direction,
    message.sender_type,
    message.sender_user_id ?? "",
    sentFromBusinessApp(message.payload) ? "app" : "",
  ].join("|")
}

const isSystem = (message: UiMessage) => message.sender_type === "system" || message.content_type === "system"

export function buildTimeline(
  messages: readonly UiMessage[],
  lines: readonly EventLine[],
  { hasOlder, dayKey }: { hasOlder: boolean; dayKey: (iso: string) => string },
): TimelineDay[] {
  // Con historial sin cargar arriba, un evento más viejo que el primer mensaje
  // quedaría amontonado en el tope: se espera a que el scroll-up llegue a él.
  const floor = hasOlder && messages.length > 0 ? messages[0].created_at : null
  const events = floor === null ? lines : lines.filter((line) => line.at >= floor)

  // Mezcla de dos listas ya ordenadas. A igual hora, el mensaje va primero: el
  // evento es consecuencia de él («pidió una persona» → «Axi la pasó»).
  const merged: ({ at: string; message: UiMessage } | { at: string; line: EventLine })[] = []
  let m = 0
  let e = 0
  while (m < messages.length || e < events.length) {
    const message = messages[m]
    const line = events[e]
    if (line === undefined || (message !== undefined && message.created_at <= line.at)) {
      merged.push({ at: message.created_at, message })
      m++
    } else {
      merged.push({ at: line.at, line })
      e++
    }
  }

  const days: TimelineDay[] = []
  for (const entry of merged) {
    const key = dayKey(entry.at) || days[days.length - 1]?.key || "unknown"
    let day = days[days.length - 1]
    if (day === undefined || day.key !== key) {
      day = { key, items: [] }
      days.push(day)
    }
    if ("line" in entry) {
      day.items.push({ kind: "event", key: `e:${entry.line.id}`, line: entry.line })
      continue
    }
    const message = entry.message
    const previous = day.items[day.items.length - 1]
    const joins =
      previous !== undefined &&
      previous.kind === "message" &&
      !isSystem(message) &&
      !isSystem(previous.message) &&
      authorKey(previous.message) === authorKey(message) &&
      Date.parse(message.created_at) - Date.parse(previous.message.created_at) < GROUP_GAP_MS
    if (joins && previous.kind === "message") previous.last = false
    day.items.push({ kind: "message", key: message.local_id ?? message.id, message, first: !joins, last: true })
  }
  return days
}
