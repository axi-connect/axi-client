import type { ConversationDTO } from "./inbox"

/**
 * Ventana de servicio de la conversación (F3): si ahora se le puede escribir
 * texto libre o media, o solo una plantilla. Espejo de la guarda del motor en
 * axi-server `enqueue_outbound_message.use_case.ts:108`, que es quien manda:
 * `OUTBOUND_WINDOW_HOURS[channel.kind]` contra `conversation.last_inbound_at`.
 * No usa `/conversations/contacts/:id/reachability`: esa lectura es por
 * contacto y puede resolver por OTRO canal que el de esta conversación.
 */

/** La tabla exacta del servidor. Un kind que no está aquí (wweb) no tiene ventana. */
export const OUTBOUND_WINDOW_HOURS: Partial<Record<ConversationDTO["channel"]["kind"], number>> = {
  whatsapp_cloud: 24,
  instagram_dm: 24,
  facebook_messenger: 24,
}

/** Solo WhatsApp Cloud abre con plantilla; wweb la rechaza (`channels/template_not_supported`). */
export function supportsTemplates(kind: ConversationDTO["channel"]["kind"]): boolean {
  return kind === "whatsapp_cloud"
}

/** Por debajo de esto, la línea avisa que la ventana está por cerrarse. */
export const WINDOW_SOON_MS = 60 * 60 * 1000

export type ReplyWindow =
  | { state: "none" }
  | { state: "open"; remainingMs: number; soon: boolean }
  | { state: "closed"; closedAgoMs: number | null; templates: boolean }

const HOUR_MS = 60 * 60 * 1000

/**
 * - Sin ventana en el canal → `none`.
 * - `last_inbound_at` null → cerrada (el cliente nunca escribió).
 * - Fuera estrictamente si `last_inbound_at < now − horas`, como el servidor:
 *   justo en el borde sigue dentro.
 */
export function replyWindow(
  conversation: Pick<ConversationDTO, "last_inbound_at"> & { channel: Pick<ConversationDTO["channel"], "kind"> },
  now: number,
): ReplyWindow {
  const hours = OUTBOUND_WINDOW_HOURS[conversation.channel.kind]
  if (hours === undefined) return { state: "none" }
  const templates = supportsTemplates(conversation.channel.kind)
  if (conversation.last_inbound_at === null) return { state: "closed", closedAgoMs: null, templates }
  const lastInbound = new Date(conversation.last_inbound_at).getTime()
  if (Number.isNaN(lastInbound)) return { state: "closed", closedAgoMs: null, templates }
  const windowStart = now - hours * HOUR_MS
  if (lastInbound < windowStart) {
    return { state: "closed", closedAgoMs: windowStart - lastInbound, templates }
  }
  const remainingMs = lastInbound - windowStart
  return { state: "open", remainingMs, soon: remainingMs < WINDOW_SOON_MS }
}

/** «21 h», «38 min», «menos de 1 min». Redondea hacia abajo: nunca promete de más. */
export function formatWindowSpan(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return "menos de 1 min"
  if (minutes < 60) return `${String(minutes)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? "1 día" : `${String(days)} días`
}

/** Nombre del canal para las frases del aviso. */
export const CHANNEL_KIND_LABEL: Record<ConversationDTO["channel"]["kind"], string> = {
  whatsapp_cloud: "WhatsApp",
  whatsapp_web: "WhatsApp",
  instagram_dm: "Instagram",
  facebook_messenger: "Messenger",
}

/** Códigos del servidor que dicen «esto no sale por la ventana». */
export const WINDOW_ERROR_CODES = {
  outsideWindow: "channels/outside_service_window",
  templateNotSupported: "channels/template_not_supported",
} as const
