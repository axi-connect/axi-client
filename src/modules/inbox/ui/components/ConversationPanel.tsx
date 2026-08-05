"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowDown, MessageSquareDashed } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useSendMessage } from "@/modules/inbox/infrastructure/realtime/use-send-message"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { MessageBubble } from "./MessageBubble"
import { ConversationHeader } from "./header/ConversationHeader"
import { Composer } from "./composer/Composer"

/**
 * Panel de conversación: header con contacto + acciones de handoff,
 * timeline con scroll-up infinito (cursor), typing en vivo y composer.
 */
export function ConversationPanel({
  commands,
  socketConnected,
  className,
}: {
  commands: InboxCommands
  socketConnected: boolean
  className?: string
}) {
  const { selected, selectedId, messagesById, typingByConversation, fetchOlderMessages } = useInboxStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  /** Evita reentrar en la paginación mientras la página anterior está en vuelo. */
  const loadingOlderRef = useRef(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  const conversationId = selected?.id ?? selectedId ?? ""
  const { send, retry } = useSendMessage(conversationId, commands, socketConnected)

  const messagesState = conversationId ? messagesById[conversationId] : undefined
  const messages = messagesState?.items ?? []
  const typingUsers = conversationId ? (typingByConversation[conversationId] ?? []) : []
  // El id del último mensaje, no solo la cantidad: un upsert (attachment
  // resuelto, transcripción lista) cambia el contenido sin cambiar la longitud.
  const lastMessageId = messages[messages.length - 1]?.id

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    stickToBottomRef.current = true
    setHasNewMessages(false)
  }, [])

  // Autoscroll al fondo cuando llegan mensajes (si el usuario estaba abajo).
  // Si estaba leyendo más arriba, no se le arrastra: se le avisa.
  useEffect(() => {
    if (stickToBottomRef.current) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
      setHasNewMessages(false)
    } else if (lastMessageId) {
      setHasNewMessages(true)
    }
  }, [messages.length, lastMessageId])

  // Al cambiar de conversación se empieza abajo y sin aviso pendiente.
  useEffect(() => {
    stickToBottomRef.current = true
    setHasNewMessages(false)
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversationId])

  // Marca como leída al abrir/enfocar.
  useEffect(() => {
    if (selected && socketConnected && selected.unread_count > 0) {
      void commands.markRead(selected.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, socketConnected])

  if (!selected) {
    return (
      <div
        className={cn(
          "h-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground",
          className,
        )}
      >
        <MessageSquareDashed className="size-12 opacity-30" />
        <p className="text-sm">Selecciona una conversación para empezar</p>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex-1 flex-col overflow-hidden", className)}>
      <ConversationHeader conversation={selected} commands={commands} />

      {/* Timeline */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget
            stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            if (stickToBottomRef.current) setHasNewMessages(false)
            // Scroll-up infinito: cerca del tope → página anterior por cursor.
            if (el.scrollTop < 60 && messagesState?.next_cursor && !loadingOlderRef.current) {
              loadingOlderRef.current = true
              const previousHeight = el.scrollHeight
              void fetchOlderMessages(selected.id).finally(() => {
                // Ancla la posición: sin esto el prepend deja el scroll pegado
                // al tope, lo que vuelve a disparar la paginación en bucle y
                // deja el hilo permanentemente "despegado" del fondo.
                requestAnimationFrame(() => {
                  el.scrollTop += el.scrollHeight - previousHeight
                  loadingOlderRef.current = false
                })
              })
            }
          }}
          className="sidebar-scroll flex-1 space-y-2 overflow-y-auto p-4"
          aria-live="polite"
        >
          {messagesState?.next_cursor && (
            <p className="text-center text-xs text-muted-foreground">Desplázate arriba para cargar más…</p>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.local_id ?? message.id}
              message={message}
              conversationId={selected.id}
              onRetry={retry}
            />
          ))}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <span className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                escribiendo<span className="animate-pulse">…</span>
              </span>
            </div>
          )}
        </div>

        {/* Llegaron mensajes mientras el operador leía más arriba: sin este
            aviso, el mensaje entra al DOM y parece que el hilo no se actualiza. */}
        {hasNewMessages && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="glass absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[0.97]"
          >
            <ArrowDown aria-hidden="true" className="size-3.5" />
            Mensajes nuevos
          </button>
        )}
      </div>

      {/* Composer */}
      <Composer
        conversation={selected}
        commands={commands}
        socketConnected={socketConnected}
        onSend={send}
      />
    </div>
  )
}
