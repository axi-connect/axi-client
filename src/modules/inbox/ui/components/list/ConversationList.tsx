"use client"

import { useCallback, useEffect, useRef } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { EmptyState } from "@/shared/components/features/empty-state/EmptyState"
import { countActive } from "@/shared/components/features/filter-panel"
import { ConversationRowSkeleton } from "@/shared/components/features/loading/InboxSkeleton"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { INBOX_FILTERS_BASE } from "@/modules/inbox/infrastructure/stores/inbox-filters.base"
import { INBOX_VIEW_LABELS } from "@/modules/inbox/domain/inbox"
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
  const filtered = q.trim() !== "" || countActive(INBOX_FILTERS_BASE, filters) > 0

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
        title="No se pudo cargar el inbox"
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
    body = filtered ? (
      <EmptyState
        glyph="noresults"
        variant="solid"
        title="Sin resultados"
        description="Ninguna conversación coincide con la búsqueda o los filtros."
        action={
          <Button type="button" size="sm" variant="outline" onClick={clearListFilters}>
            Limpiar filtros
          </Button>
        }
        className="mx-1 border-transparent py-10"
      />
    ) : (
      <EmptyState
        glyph="conversation"
        title={
          view === "closed"
            ? "Aún no hay conversaciones cerradas"
            : `No hay conversaciones en “${INBOX_VIEW_LABELS[view]}”`
        }
        description={
          view === "closed" ? "Cuando resuelvas o cierres una, quedará aquí para consultarla." : undefined
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
