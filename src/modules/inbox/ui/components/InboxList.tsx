"use client"

import { useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { InboxListHeader } from "./list/InboxListHeader"
import { ConversationList } from "./list/ConversationList"
import { InboxNextUpStrip } from "./day/InboxNextUpStrip"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"

/**
 * Lista de conversaciones (320 px en md+, full-width en móvil): cabecera con
 * vistas/orden/búsqueda/filtros y lista con scroll infinito. Es solo el
 * cascarón: cada hijo se suscribe a lo suyo del store, así un mensaje nuevo
 * no re-renderiza la cabecera ni la cabecera re-renderiza la lista.
 *
 * Panel de contenido ⇒ superficie SÓLIDA (DS §5.2): sin glass ni transparencia.
 */
export function InboxList({ className, commands }: { className?: string; commands?: InboxCommands }) {
  const fetchFirstPage = useInboxStore((s) => s.fetchFirstPage)
  const fetchCounts = useInboxStore((s) => s.fetchCounts)

  useEffect(() => {
    void fetchFirstPage()
    void fetchCounts()
  }, [fetchFirstPage, fetchCounts])

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col border-r border-border bg-background md:w-80 md:shrink-0",
        className,
      )}
    >
      <InboxListHeader />
      {/* <md no hay panel para «Tu día»: lo próximo va arriba de la lista. */}
      <InboxNextUpStrip commands={commands} className="mx-3 mt-3 shrink-0 md:hidden" />
      <ConversationList />
    </div>
  )
}
