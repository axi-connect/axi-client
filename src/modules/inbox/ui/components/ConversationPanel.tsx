"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, MessageSquare, TriangleAlert } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { useAuth } from "@/shared/auth/auth.hooks"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useMyCompany } from "@/modules/companies/public"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useSendMessage } from "@/modules/inbox/infrastructure/realtime/use-send-message"
import { useConversationEvents } from "@/modules/inbox/infrastructure/hooks/use-conversation-events"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { isReadOnlyConversation, sentFromBusinessApp, type ConversationDTO, type UiMessage } from "@/modules/inbox/domain/inbox"
import { buildEventLines, closedBy, handoffReason } from "@/modules/inbox/domain/conversation-events"
import { useMinuteTick } from "@/modules/inbox/ui/hooks/use-minute-tick"
import { MessageBubble } from "./MessageBubble"
import { ClosedConversationFooter } from "./ClosedConversationFooter"
import { DaySeparator } from "./timeline/DaySeparator"
import { EventLineView } from "./timeline/EventLineView"
import { buildTimeline } from "./timeline/build-timeline"
import { businessDayLabel, businessTimeZone, dayKeyIn } from "./timeline/business-day"
import { ConversationHeader } from "./header/ConversationHeader"
import { useHandoffActions } from "./header/use-handoff-actions"
import { Composer } from "./composer/Composer"
import { InboxDayPanel } from "./day/InboxDayPanel"

/**
 * Panel de conversación. Sin conversación abierta cuenta el día («Tu día», F1).
 * Con una pedida que aún no llega pinta la silueta del hilo, para que «Tu día»
 * no parpadee en medio. Con una abierta, `OpenConversation`.
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
  const selected = useInboxStore((s) => s.selected)
  const selectedId = useInboxStore((s) => s.selectedId)

  if (selected !== null) {
    return <OpenConversation key={selected.id} conversation={selected} commands={commands} socketConnected={socketConnected} className={className} />
  }
  if (selectedId === null) return <InboxDayPanel commands={commands} className={className} />
  return <OpeningSkeleton className={className} />
}

function OpeningSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Abriendo la conversación" aria-busy="true" className={cn("min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex-1 space-y-3 bg-muted/40 p-5">
        <Skeleton className="h-10 w-3/5 rounded-2xl" />
        <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
        <Skeleton className="h-10 w-2/5 rounded-2xl" />
      </div>
    </div>
  )
}

/**
 * La conversación abierta (Inbox premium F2):
 * - cabecera con quién la tiene;
 * - en cola, «Atender» como isla en la cabecera (el motivo va en su `title` y
 *   como línea del hilo);
 * - el hilo con mensajes y eventos de handoff intercalados, días en la zona del
 *   negocio y autores agrupados;
 * - el composer, o la barra que dice por qué todavía no se puede escribir.
 *
 * `useHandoffActions` se monta UNA vez aquí, para la cabecera y la barra del
 * composer, y así un solo juego de modales.
 */
function OpenConversation({
  conversation,
  commands,
  socketConnected,
  className,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
  socketConnected: boolean
  className?: string
}) {
  const conversationId = conversation.id
  const messagesState = useInboxStore((s) => s.messagesById[conversationId])
  const typingUsers = useInboxStore((s) => s.typingByConversation[conversationId])
  const fetchOlderMessages = useInboxStore((s) => s.fetchOlderMessages)
  const fetchMessages = useInboxStore((s) => s.fetchMessages)
  const threadError = useInboxStore((s) => s.error)
  const meId = useAuth().user?.id ?? null
  const tz = businessTimeZone(useMyCompany().company?.timezone)
  const now = useMinuteTick()

  const scrollRef = useRef<HTMLDivElement>(null)
  // F3: toda la conversación recibe archivos arrastrados; el composer los encola.
  const dropRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  /** Evita reentrar en la paginación mientras la página anterior está en vuelo. */
  const loadingOlderRef = useRef(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  /**
   * Lo que se anuncia al lector de pantalla: SOLO el entrante que acaba de
   * llegar. El hilo no es región viva, porque el prepend del historial se
   * leería entero.
   */
  const [announcement, setAnnouncement] = useState("")
  const announcedRef = useRef<string | null>(null)

  const { send, retry } = useSendMessage(conversationId, commands, socketConnected)
  const handoff = useHandoffActions(conversation, commands)
  const { events, loaded: eventsLoaded, reachBack } = useConversationEvents(conversationId)

  const messages = useMemo(() => messagesState?.items ?? [], [messagesState])
  const hasOlder = Boolean(messagesState?.next_cursor)
  const lines = useMemo(() => buildEventLines(events, meId), [events, meId])
  const days = useMemo(() => buildTimeline(messages, lines, { hasOlder, dayKey: dayKeyIn(tz) }), [messages, lines, hasOlder, tz])
  const reason = useMemo(() => handoffReason(events), [events])
  const closer = useMemo(() => closedBy(events, meId), [events, meId])
  // El id del último mensaje, no solo la cantidad: un upsert (attachment
  // resuelto, transcripción lista) cambia el contenido sin cambiar la longitud.
  const lastMessageId = messages[messages.length - 1]?.id
  const oldestMessageAt = messages[0]?.created_at

  // Tras el scroll-up, los eventos siguen al mensaje más viejo cargado.
  // Sin historial por cargar, se traen también los eventos más viejos (`""`).
  useEffect(() => {
    if (!eventsLoaded || oldestMessageAt === undefined) return
    reachBack(hasOlder ? oldestMessageAt : "")
  }, [eventsLoaded, oldestMessageAt, hasOlder, reachBack])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    stickToBottomRef.current = true
    setHasNewMessages(false)
  }, [])

  // Anuncia el entrante nuevo (no el que ya estaba al abrir).
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last === undefined) return
    if (announcedRef.current === null) {
      announcedRef.current = last.id
      return
    }
    if (announcedRef.current === last.id) return
    announcedRef.current = last.id
    if (last.direction !== "inbound") return
    const name = conversation.contact.full_name || conversation.contact.phone || "El contacto"
    setAnnouncement(`Nuevo mensaje de ${name}: ${last.body ?? "archivo adjunto"}`)
  }, [messages, conversation.contact.full_name, conversation.contact.phone])

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

  // Una conversación nueva (el `key` remonta) empieza abajo y sin aviso pendiente.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // Marca como leída al abrir y cada vez que entra un mensaje a la conversación
  // abierta. Optimista: la fila y el total bajan al instante; si el ack falla se
  // revierte. Solo con la pestaña visible: leer en una pestaña oculta no es leer.
  const selectedUnread = conversation.unread_count
  const readOnly = isReadOnlyConversation(conversation)
  const markReadLocal = useInboxStore((s) => s.markReadLocal)
  const rollbackUnread = useInboxStore((s) => s.rollbackUnread)
  useEffect(() => {
    if (!socketConnected || readOnly || selectedUnread === 0) return
    const attempt = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      const previous = markReadLocal(conversationId)
      if (previous === 0) return
      void commands.markRead(conversationId).then((ack) => {
        if (!ack.ok) rollbackUnread(conversationId, previous)
      })
    }
    attempt()
    document.addEventListener("visibilitychange", attempt)
    return () => document.removeEventListener("visibilitychange", attempt)
  }, [conversationId, selectedUnread, socketConnected, readOnly, commands, markReadLocal, rollbackUnread])

  const authorOf = (message: UiMessage): string | null => {
    if (message.direction !== "outbound") return null
    if (message.sender_type === "ai_agent") return "Axi"
    if (message.sender_type !== "user") return null
    if (sentFromBusinessApp(message.payload)) return "Desde el celular del negocio"
    return message.sender_user_id !== null && message.sender_user_id === meId ? "Tú" : "El equipo"
  }

  const loaded = messagesState?.loaded === true

  return (
    <div ref={dropRef} className={cn("relative min-h-0 flex-1 flex-col overflow-hidden bg-background", className)}>
      <ConversationHeader conversation={conversation} handoff={handoff} meId={meId} now={now} reason={reason?.sentence ?? null} />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

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
              void fetchOlderMessages(conversationId).finally(() => {
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
          // Contenedor de BLOQUE (DS §4.2): el `sticky` de los separadores y
          // el ancla del prepend dependen de que el scroller no sea flex-col.
          // Superficie de lectura: un gris apenas más hondo para que las
          // burbujas entrantes (card) se despeguen del fondo.
          className="sidebar-scroll flex-1 overflow-y-auto overscroll-contain bg-muted/40 px-4 pt-1 pb-5 sm:px-5"
        >
          {threadError !== null && messages.length === 0 ? (
            <ThreadNotice
              icon={<TriangleAlert aria-hidden className="size-6" />}
              title="No pudimos leer la conversación"
              text="Se perdió la conexión con el servidor. Lo que ya se envió está a salvo."
              action={
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void fetchMessages(conversationId)}>
                  Reintentar
                </Button>
              }
            />
          ) : loaded && messages.length === 0 && lines.length === 0 ? (
            <ThreadNotice
              icon={<MessageSquare aria-hidden className="size-6" />}
              title="Aún no hay mensajes"
              text="Cuando el contacto escriba, lo verás aquí."
            />
          ) : (
            <div>
              {hasOlder && <p className="py-2 text-center text-xs text-muted-foreground">Desplázate arriba para cargar más…</p>}
              {days.map((day) => {
                const label = businessDayLabel(day.key, now, tz)
                return (
                  <section key={day.key} aria-label={label}>
                    <DaySeparator label={label} />
                    {day.items.map((item) =>
                      item.kind === "event" ? (
                        <EventLineView key={item.key} line={item.line} />
                      ) : (
                        <div key={item.key} className={item.first ? "mt-3" : "mt-1"}>
                          <MessageBubble
                            message={item.message}
                            conversationId={conversationId}
                            onRetry={retry}
                            first={item.first}
                            last={item.last}
                            author={authorOf(item.message)}
                          />
                        </div>
                      ),
                    )}
                  </section>
                )
              })}
              {typingUsers !== undefined && typingUsers.length > 0 && (
                <div className="mt-3 flex justify-start">
                  <span
                    role="status"
                    aria-label={`${conversation.contact.full_name || "El contacto"} está escribiendo`}
                    className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3"
                  >
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        aria-hidden
                        className="size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
                        style={{ animationDelay: `${String(delay)}ms` }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Llegaron mensajes mientras el operador leía más arriba: sin este
            aviso, el mensaje entra al DOM y parece que el hilo no se actualiza.
            Flota sobre el hilo ⇒ cristal (DESIGN §5.1). */}
        {hasNewMessages && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="glass absolute bottom-3 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none"
          >
            <ArrowDown aria-hidden="true" className="size-3.5" />
            Mensajes nuevos
          </button>
        )}
      </div>

      {/* Composer — o el pie de solo lectura si la conversación está cerrada */}
      {readOnly ? (
        <ClosedConversationFooter conversation={conversation} by={closer} />
      ) : (
        <Composer
          conversation={conversation}
          commands={commands}
          socketConnected={socketConnected}
          onSend={send}
          unlock={handoff.primary !== null && handoff.primary.id !== "close" ? handoff.primary : null}
          unlockBusy={handoff.busy}
          dropTargetRef={dropRef}
        />
      )}
    </div>
  )
}

function ThreadNotice({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    // `my-auto` y no `justify-center`: centrado seguro dentro de un scroller (DS §4.2).
    <div className="flex min-h-full flex-col items-center py-10 text-center">
      <div className="my-auto flex flex-col items-center gap-2.5">
        <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
        <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">{text}</p>
        {action}
      </div>
    </div>
  )
}
