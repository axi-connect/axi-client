"use client"

import { useEffect, useState } from "react"
import { create } from "zustand"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import { replyWindow, supportsTemplates, WINDOW_ERROR_CODES, type ReplyWindow } from "@/modules/inbox/domain/reply-window"

/** Mismo tick que los eventos de F2: la línea cuenta minutos, no segundos. */
export const REPLY_WINDOW_TICK_MS = 60_000

/**
 * La regla del cliente no es la verdad: si el servidor rechaza un envío por
 * ventana, se recuerda con el `last_inbound_at` que tenía la conversación en
 * ese momento. Mientras no cambie (el cliente no volvió a escribir), la
 * ventana se da por cerrada aunque el reloj local diga otra cosa.
 */
type Rejections = {
  byConversation: Record<string, string | null>
  reject: (conversationId: string, lastInboundAt: string | null) => void
}

export const useWindowRejections = create<Rejections>((set) => ({
  byConversation: {},
  reject: (conversationId, lastInboundAt) =>
    set((state) => ({ byConversation: { ...state.byConversation, [conversationId]: lastInboundAt } })),
}))

/** ¿El error de un envío dice que la ventana está cerrada? */
export function isWindowRejection(code: string | undefined | null): boolean {
  return code === WINDOW_ERROR_CODES.outsideWindow
}

export function useReplyWindow(
  conversation: Pick<ConversationDTO, "id" | "last_inbound_at"> & { channel: Pick<ConversationDTO["channel"], "kind"> },
): ReplyWindow {
  const [now, setNow] = useState(() => Date.now())
  const rejectedWith = useWindowRejections((state) => state.byConversation[conversation.id])

  useEffect(() => {
    setNow(Date.now())
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (timer === null) timer = setInterval(() => setNow(Date.now()), REPLY_WINDOW_TICK_MS)
    }
    const stop = () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now())
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [conversation.id, conversation.last_inbound_at])

  const local = replyWindow(conversation, now)
  if (rejectedWith !== undefined && rejectedWith === conversation.last_inbound_at && local.state !== "closed") {
    return { state: "closed", closedAgoMs: null, templates: supportsTemplates(conversation.channel.kind) }
  }
  return local
}
