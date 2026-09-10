"use client"

import { useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { InboxListHeader } from "./list/InboxListHeader"
import { ConversationList } from "./list/ConversationList"

/**
 * Rail de conversaciones (288 px en md+, full-width en móvil): cabecera con
 * vistas/orden/búsqueda/filtros y lista con scroll infinito. Es solo el
 * cascarón: cada hijo se suscribe a lo suyo del store, así un mensaje nuevo
 * no re-renderiza la cabecera ni la cabecera re-renderiza la lista.
 *
 * Panel de contenido ⇒ superficie SÓLIDA (DS §5.2): sin glass ni transparencia.
 */
export function InboxList({ className }: { className?: string }) {
  const fetchFirstPage = useInboxStore((s) => s.fetchFirstPage)
  const fetchCounts = useInboxStore((s) => s.fetchCounts)

  useEffect(() => {
    void fetchFirstPage()
    void fetchCounts()
  }, [fetchFirstPage, fetchCounts])

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col border-r border-border bg-background md:w-72 md:shrink-0",
        className,
      )}
    >
      <InboxListHeader />
      <ConversationList />
    </div>
  )
}
