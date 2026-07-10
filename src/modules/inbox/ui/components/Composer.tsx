"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Button } from "@/shared/components/ui/button"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"

/**
 * Composer del inbox: textarea + envío (Enter) + typing con debounce.
 * Deshabilitado si la IA atiende (`ai_active`, requiere takeover) o si la
 * conversación no está abierta. La lógica de envío vive en use-send-message.
 */
const TYPING_IDLE_MS = 2_500

export function Composer({
  conversation,
  commands,
  socketConnected,
  onSend,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
  socketConnected: boolean
  onSend: (text: string) => Promise<void>
}) {
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const typingRef = useRef<{ active: boolean; timer: ReturnType<typeof setTimeout> | null }>({
    active: false,
    timer: null,
  })

  const canWrite = conversation.status === "open" && conversation.mode === "human_active"

  const stopTyping = useCallback(() => {
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer)
    if (typingRef.current.active) {
      typingRef.current.active = false
      void commands.typing(conversation.id, false)
    }
  }, [commands, conversation.id])

  // Al desmontar o cambiar de conversación, apaga el typing.
  useEffect(() => stopTyping, [stopTyping])

  const handleTyping = (value: string) => {
    setBody(value)
    if (!canWrite || !socketConnected) return
    if (!typingRef.current.active) {
      typingRef.current.active = true
      void commands.typing(conversation.id, true)
    }
    if (typingRef.current.timer) clearTimeout(typingRef.current.timer)
    typingRef.current.timer = setTimeout(() => {
      typingRef.current.active = false
      void commands.typing(conversation.id, false)
    }, TYPING_IDLE_MS)
  }

  const handleSubmit = async () => {
    const text = body.trim()
    if (!text || sending || !canWrite) return
    setSending(true)
    setBody("")
    stopTyping()
    await onSend(text)
    setSending(false)
  }

  return (
    <div className="border-t border-border bg-background p-3">
      {!canWrite && (
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {conversation.status !== "open"
            ? "La conversación está cerrada."
            : conversation.mode === "ai_active"
              ? "La IA está atendiendo: usa “Intervenir” para responder tú."
              : "Toma la conversación (“Atender”) para responder."}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          disabled={!canWrite || sending}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          rows={1}
          placeholder={canWrite ? "Escribe un mensaje… (Enter para enviar)" : "No disponible"}
          className={cn(
            "max-h-32 min-h-10 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm",
            "focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
          )}
          aria-label="Mensaje"
        />
        <Button
          size="icon"
          disabled={!canWrite || sending || !body.trim()}
          onClick={() => void handleSubmit()}
          aria-label="Enviar mensaje"
        >
          <SendHorizonal className="size-4" />
        </Button>
      </div>
      {!socketConnected && canWrite && (
        <p className="mt-1 text-[10px] text-warning">
          Sin tiempo real: los envíos van por HTTP y se confirman al reconectar.
        </p>
      )}
    </div>
  )
}
