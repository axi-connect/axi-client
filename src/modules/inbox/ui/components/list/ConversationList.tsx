"use client"

import { useCallback, useEffect, useRef } from "react"
import { TriangleAlert } from "lucide-react"
import { useAuth } from "@/shared/auth/auth.hooks"
import { Button } from "@/shared/components/ui/button"
import { EmptyState } from "@/shared/components/features/empty-state/EmptyState"
import { countActive } from "@/shared/components/features/filter-panel"
import { ConversationRowSkeleton } from "@/shared/components/features/loading/InboxSkeleton"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { INBOX_FILTERS_BASE } from "@/modules/inbox/infrastructure/stores/inbox-filters.base"
import type { InboxCounts, InboxView } from "@/modules/inbox/domain/inbox"
import { useMinuteTick } from "@/modules/inbox/ui/hooks/use-minute-tick"
import { ConversationListItem } from "./ConversationListItem"
import { ConversationListFooter } from "./ConversationListFooter"

const FIRST_LOAD_ROWS = 8

/**
 * La lista con scroll infinito. El scroller es un contenedor de BLOQUE
 * (`min-h-0 flex-1 overflow-y-auto`, DS §4.2), nunca `flex flex-col`. Un
 * `IntersectionObserver` sobre el sentinel del pie pide la página siguiente;
 * el sentinel solo existe cuando de verdad hay más, así el store nunca recibe
 * llamadas en bucle.
 */
export function ConversationList() {
  const conversations = useInboxStore((s) => s.conversations)
  const loadingList = useInboxStore((s) => s.loadingList)
  const loadingMore = useInboxStore((s) => s.loadingMore)
  const hasMore = useInboxStore((s) => s.hasMore)
  const listError = useInboxStore((s) => s.listError)
  const total = useInboxStore((s) => s.total)
  const view = useInboxStore((s) => s.view)
  const q = useInboxStore((s) => s.q)
  const filters = useInboxStore((s) => s.filters)
  const selectedId = useInboxStore((s) => s.selectedId)
  const select = useInboxStore((s) => s.select)
  const loadMore = useInboxStore((s) => s.loadMore)
  const fetchFirstPage = useInboxStore((s) => s.fetchFirstPage)
  const clearListFilters = useInboxStore((s) => s.clearListFilters)
  const setView = useInboxStore((s) => s.setView)
  const counts = useInboxStore((s) => s.counts)
  const meId = useAuth().user?.id ?? null

  const now = useMinuteTick()
  const scrollRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Ref-callback: el sentinel entra y sale del DOM según `hasMore`, así que el
  // observer se crea al montarlo y se destruye al desmontarlo.
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (node === null || typeof IntersectionObserver === "undefined") return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) void useInboxStore.getState().loadMore()
        },
        { root: scrollRef.current, rootMargin: "160px" },
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [],
  )
  useEffect(() => () => observerRef.current?.disconnect(), [])

  const onSelect = useCallback((id: string) => void select(id), [select])
  const hasFilters = countActive(INBOX_FILTERS_BASE, filters) > 0
  const filtered = q.trim() !== "" || hasFilters

  let body: React.ReactNode
  if (loadingList && conversations.length === 0) {
    body = (
      <div role="status" aria-label="Cargando conversaciones" aria-busy="true" className="space-y-0.5">
        {Array.from({ length: FIRST_LOAD_ROWS }).map((_, index) => (
          <ConversationRowSkeleton key={index} />
        ))}
      </div>
    )
  } else if (listError !== null && conversations.length === 0) {
    body = (
      <EmptyState
        icon={TriangleAlert}
        accent="muted"
        variant="solid"
        title="No pudimos leer el inbox"
        description={listError}
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => void fetchFirstPage()}>
            Reintentar
          </Button>
        }
        className="mx-1 border-transparent py-10"
      />
    )
  } else if (conversations.length === 0) {
    const empty = emptyCopy(view, counts)
    body = filtered ? (
      <EmptyState
        glyph="noresults"
        variant="solid"
        title="Ninguna coincide"
        description={
          q.trim() !== ""
            ? `No hay conversaciones con «${q.trim()}» en esta vista. Prueba en otra vista o quita los filtros.`
            : "Ninguna conversación de esta vista cumple los filtros."
        }
        action={
          <Button type="button" size="sm" variant="outline" onClick={clearListFilters}>
            {hasFilters ? "Limpiar filtros" : "Limpiar búsqueda"}
          </Button>
        }
        className="mx-1 border-transparent py-10"
      />
    ) : (
      <EmptyState
        glyph="conversation"
        title={empty.title}
        description={empty.description}
        action={
          empty.next !== null ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setView(empty.next?.view ?? "all_open")}>
              {empty.next.label}
            </Button>
          ) : undefined
        }
        className="mx-1 border-transparent py-10"
      />
    )
  } else {
    body = (
      <>
        <ul className="space-y-0.5" aria-busy={loadingMore || loadingList}>
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === selectedId}
              now={now}
              showMode={view === "all_open"}
              meId={meId}
              onSelect={onSelect}
            />
          ))}
        </ul>
        <ConversationListFooter
          loaded={conversations.length}
          total={total}
          hasMore={hasMore}
          loadingMore={loadingMore}
          error={listError}
          onRetry={() => void loadMore()}
          sentinelRef={sentinelRef}
        />
      </>
    )
  }

  return (
    <div ref={scrollRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2">
      {body}
    </div>
  )
}

/** Qué dice cada vista vacía y adónde lleva (voz del progreso: qué pasa y qué sigue). */
export function emptyCopy(
  view: InboxView,
  counts: InboxCounts | null,
): { title: string; description?: string; next: { label: string; view: InboxView } | null } {
  switch (view) {
    case "queued":
      return {
        title: "Nadie espera",
        description:
          counts !== null && counts.ai > 0
            ? `Axi atiende ${counts.ai === 1 ? "1 conversación" : `${String(counts.ai)} conversaciones`}. Si pasa una al equipo, aparece aquí.`
            : "Cuando Axi pase una conversación al equipo, aparece aquí.",
        next: counts !== null && counts.ai > 0 ? { label: "Ver lo que atiende Axi", view: "ai" } : null,
      }
    case "mine":
      return {
        title: "Ninguna asignada a ti",
        description: "Cuando atiendas una de la cola, quedará aquí hasta cerrarla.",
        next: counts !== null && counts.queued > 0 ? { label: "Ver la cola", view: "queued" } : null,
      }
    case "ai":
      return { title: "Axi no atiende ninguna ahora", description: "Responde apenas alguien escriba por tus canales.", next: null }
    case "all_open":
      return { title: "No hay conversaciones abiertas", description: "Llegan solas por tus canales conectados.", next: null }
    case "closed":
      return {
        title: "Aún no hay conversaciones cerradas",
        description: "Cuando resuelvas o cierres una, quedará aquí para consultarla.",
        next: null,
      }
  }
}
