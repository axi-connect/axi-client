"use client"

import { Button } from "@/shared/components/ui/button"
import { ConversationRowSkeleton } from "@/shared/components/features/loading/InboxSkeleton"
import { INBOX_MAX_LOADED } from "@/modules/inbox/infrastructure/stores/inbox-query"

function formatCount(value: number): string {
  return value.toLocaleString("es-CO")
}

/**
 * Pie de la lista con scroll infinito: skeleton mientras carga la página
 * siguiente, fila de error con reintento, contador «Mostrando X de Y» con el
 * sentinel que dispara la carga, o el cierre cuando ya no hay más.
 * `role="status"` para que el lector oiga avanzar el contador.
 */
export function ConversationListFooter({
  loaded,
  total,
  hasMore,
  loadingMore,
  error,
  onRetry,
  sentinelRef,
}: {
  loaded: number
  total: number
  hasMore: boolean
  loadingMore: boolean
  error: string | null
  onRetry: () => void
  sentinelRef: (node: HTMLDivElement | null) => void
}) {
  if (loadingMore) {
    return (
      <div aria-hidden="true" className="space-y-0.5">
        <ConversationRowSkeleton />
        <ConversationRowSkeleton />
        <ConversationRowSkeleton />
      </div>
    )
  }
  if (error !== null && loaded > 0) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span>No se pudo cargar más</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (loaded === 0) return null

  const capped = loaded >= INBOX_MAX_LOADED
  return (
    <div role="status" className="py-3 text-center text-[11px] text-muted-foreground tabular-nums">
      <p>
        Mostrando {formatCount(loaded)} de {formatCount(total)}
        {!hasMore && " · No hay más conversaciones"}
        {hasMore && capped && " · Refina la búsqueda para ver más"}
      </p>
      {/* Sentinel: solo existe cuando de verdad se puede cargar más. */}
      {hasMore && !capped && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
    </div>
  )
}
