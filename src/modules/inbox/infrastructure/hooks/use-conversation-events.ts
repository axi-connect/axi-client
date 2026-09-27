"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ConversationEvent } from "@/modules/inbox/domain/inbox"
import { getConversationEvents } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"

/**
 * Los eventos de handoff del hilo ABIERTO (Inbox premium F2). Nunca por fila de
 * la lista (plan §8, N+1).
 *
 * Frescura, en tres fuentes:
 * - `eventsVersion` del store: el socket avisa `escalated`, `claimed`,
 *   `taken_over`, `returned_to_ai`, `status_changed` y `sla_breached`.
 * - El tick de {@link EVENTS_TICK_MS} con la pestaña visible, para lo que no
 *   tiene evento WS: `note_added` y `priority_changed`. No son en vivo, y el
 *   test lo fija.
 * - Volver la pestaña a visible relee en el acto, sin esperar al tick.
 *
 * Paginación: el servidor da los eventos del más nuevo al más viejo con cursor.
 * `reachBack(iso)` pide páginas hasta cubrir el mensaje más viejo cargado (lo
 * llama el hilo tras el scroll-up), con un tope de páginas por llamada.
 */

export const EVENTS_PAGE_SIZE = 50
export const EVENTS_TICK_MS = 60_000
const MAX_PAGES_PER_REACH = 3

export interface ConversationEventsState {
  events: ConversationEvent[]
  loaded: boolean
  reachBack: (oldestMessageAt: string) => void
}

export function useConversationEvents(conversationId: string | null): ConversationEventsState {
  const version = useInboxStore((s) => (conversationId === null ? 0 : (s.eventsVersion[conversationId] ?? 0)))
  const [events, setEvents] = useState<ConversationEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const cursor = useRef<string | undefined>(undefined)
  const turn = useRef(0)
  const reaching = useRef(false)
  const loadedRef = useRef(false)

  const loadLatest = useCallback(() => {
    if (conversationId === null) return
    const current = ++turn.current
    getConversationEvents(conversationId, { limit: EVENTS_PAGE_SIZE })
      .then((page) => {
        if (current !== turn.current) return
        setEvents((previous) => mergeEvents(previous, page.data))
        // Solo la primera lectura fija el cursor: una relectura trae lo nuevo y
        // no debe rebobinar lo que el scroll-up ya fue pidiendo.
        if (!loadedRef.current) cursor.current = page.next_cursor ?? undefined
        loadedRef.current = true
        setLoaded(true)
      })
      .catch(() => {
        // Los eventos acompañan al hilo; si fallan, el hilo sigue. Reintenta el próximo aviso.
        if (current === turn.current) setLoaded(true)
      })
  }, [conversationId])

  // Al cambiar de conversación se empieza de cero, y una respuesta en vuelo de
  // la anterior se descarta (sube el turno).
  useEffect(() => {
    turn.current++
    setEvents([])
    setLoaded(false)
    loadedRef.current = false
    cursor.current = undefined
  }, [conversationId])

  // Al abrir y con cada aviso del socket.
  useEffect(() => {
    loadLatest()
  }, [loadLatest, version])

  // El tick con la pestaña visible y la vuelta a la pestaña.
  useEffect(() => {
    if (conversationId === null) return
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible"
    const timer = setInterval(() => {
      if (visible()) loadLatest()
    }, EVENTS_TICK_MS)
    const onVisibility = () => {
      if (visible()) loadLatest()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [conversationId, loadLatest])

  const reachBack = useCallback(
    (oldestMessageAt: string) => {
      if (conversationId === null || reaching.current) return
      reaching.current = true
      const id = conversationId
      void (async () => {
        try {
          for (let page = 0; page < MAX_PAGES_PER_REACH; page++) {
            const next = cursor.current
            if (next === undefined) break
            const res = await getConversationEvents(id, { cursor: next, limit: EVENTS_PAGE_SIZE })
            cursor.current = res.next_cursor ?? undefined
            setEvents((previous) => mergeEvents(previous, res.data))
            const oldest = res.data[res.data.length - 1]?.created_at
            if (oldest === undefined || oldest <= oldestMessageAt) break
          }
        } catch {
          // El próximo scroll-up reintenta.
        } finally {
          reaching.current = false
        }
      })()
    },
    [conversationId],
  )

  return { events, loaded, reachBack }
}

/** Une por id, sin duplicados: una relectura y una página vieja pueden solaparse. */
export function mergeEvents(previous: readonly ConversationEvent[], incoming: readonly ConversationEvent[]): ConversationEvent[] {
  if (incoming.length === 0) return previous as ConversationEvent[]
  const byId = new Map(previous.map((event) => [event.id, event]))
  for (const event of incoming) byId.set(event.id, event)
  return [...byId.values()]
}
