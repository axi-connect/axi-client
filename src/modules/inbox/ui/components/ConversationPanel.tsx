"use client"

import { useEffect, useRef } from "react"
import { MessageSquareDashed } from "lucide-react"
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

  const conversationId = selected?.id ?? selectedId ?? ""
  const { send, retry } = useSendMessage(conversationId, commands, socketConnected)

  const messagesState = conversationId ? messagesById[conversationId] : undefined
  const messages = messagesState?.items ?? []
  const typingUsers = conversationId ? (typingByConversation[conversationId] ?? []) : []

  // Autoscroll al fondo cuando llegan mensajes (si el usuario estaba abajo).
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages.length, conversationId])

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
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
          // Scroll-up infinito: cerca del tope → página anterior por cursor.
          if (el.scrollTop < 60 && messagesState?.next_cursor) {
            void fetchOlderMessages(selected.id)
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
