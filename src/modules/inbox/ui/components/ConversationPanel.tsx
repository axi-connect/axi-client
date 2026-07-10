"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { MessageSquareDashed } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useSendMessage } from "@/modules/inbox/infrastructure/realtime/use-send-message"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { MODE_LABELS, STATUS_LABELS } from "@/modules/inbox/domain/inbox"
import { MessageBubble } from "./MessageBubble"
import { HandoffActions } from "./HandoffActions"
import { Composer } from "./Composer"

/**
 * Panel de conversación: header con contacto + acciones de handoff,
 * timeline con scroll-up infinito (cursor), typing en vivo y composer.
 */
export function ConversationPanel({
  commands,
  socketConnected,
}: {
  commands: InboxCommands
  socketConnected: boolean
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
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <MessageSquareDashed className="size-12 opacity-30" />
        <p className="text-sm">Selecciona una conversación para empezar</p>
      </div>
    )
  }

  const contactName = selected.contact.full_name || selected.contact.phone || "Sin nombre"

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/60 px-4 py-3">
        <div className="flex items-center gap-3">
          {selected.contact.avatar_url ? (
            <Image
              src={selected.contact.avatar_url}
              alt={`Avatar de ${contactName}`}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {contactName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{contactName}</span>
              <Badge variant="secondary" className="text-[10px]">{MODE_LABELS[selected.mode]}</Badge>
              {selected.status !== "open" && (
                <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[selected.status]}</Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {selected.contact.phone ?? ""} · {selected.channel.name}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <HandoffActions conversation={selected} commands={commands} />
        </div>
      </div>

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
        className="flex-1 space-y-2 overflow-y-auto p-4"
        aria-live="polite"
      >
        {messagesState?.next_cursor && (
          <p className="text-center text-xs text-muted-foreground">Desplázate arriba para cargar más…</p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.local_id ?? message.id} message={message} onRetry={retry} />
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
