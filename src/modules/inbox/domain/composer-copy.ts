import { formatBytes } from "@/core/lib/format"
import type { ComposerRejection, ConversationDTO, OutboundMediaKind } from "./inbox"
import { CHANNEL_KIND_LABEL, formatWindowSpan, type ReplyWindow } from "./reply-window"

/**
 * Textos del composer (F3) como funciones puras: la línea de la ventana, el
 * aviso cuando no se puede escribir y lo que no entró a la cola. Un solo
 * lugar para la copia; la UI solo pinta.
 */

const KIND_NOUN: Record<OutboundMediaKind, string> = {
  image: "fotos",
  video: "videos",
  audio: "audios",
  document: "documentos",
}

/** «x.zip no se puede enviar por WhatsApp. y.mov pesa 48 MB y el máximo para videos es 16 MB.» */
export function rejectionSentence(
  rejections: (ComposerRejection & { size_bytes?: number })[],
  channelKind: ConversationDTO["channel"]["kind"],
): string {
  const channel = CHANNEL_KIND_LABEL[channelKind]
  return rejections
    .map((r) => {
      if (r.reason === "type") return `${r.file_name} no se puede enviar por ${channel}.`
      const max = r.max_bytes !== undefined ? formatBytes(r.max_bytes) : "el permitido"
      const noun = r.kind !== undefined ? KIND_NOUN[r.kind] : "este tipo"
      return `${r.file_name} supera el máximo para ${noun} (${max}).`
    })
    .join(" ")
}

/** La línea sobre la caja. `null` cuando no hay nada que decir (wweb, o cerrada: ahí manda el aviso). */
export function windowLine(window: ReplyWindow): { tone: "ok" | "warn"; lead: string; value: string; tail?: string } | null {
  if (window.state !== "open") return null
  if (window.soon) {
    return { tone: "warn", lead: "Se cierra en", value: formatWindowSpan(window.remainingMs), tail: "después, solo plantilla" }
  }
  return { tone: "ok", lead: "Ventana de 24 h · quedan", value: formatWindowSpan(window.remainingMs) }
}

/** El aviso que reemplaza la caja cuando la ventana está cerrada. */
export function closedWindowNotice(
  window: Extract<ReplyWindow, { state: "closed" }>,
  channelKind: ConversationDTO["channel"]["kind"],
  firstName: string,
): { title: string; body: string } {
  const ago = window.closedAgoMs !== null ? ` hace ${formatWindowSpan(window.closedAgoMs)}` : ""
  if (window.templates) {
    return {
      title: `La ventana de 24 h se cerró${ago}.`,
      body: `WhatsApp solo deja escribirle a ${firstName} con una plantilla aprobada. Cuando responda, se abre de nuevo.`,
    }
  }
  const channel = CHANNEL_KIND_LABEL[channelKind]
  return {
    title: `${channel} solo deja responder durante las 24 h siguientes al último mensaje del cliente.`,
    body: `Esa ventana se cerró${ago}; cuando ${firstName} vuelva a escribir, se abre.`,
  }
}
