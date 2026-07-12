"use client"

import { useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { useInboxSocket } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { InboxList } from "./components/InboxList"
import { ConversationPanel } from "./components/ConversationPanel"

/**
 * Vista compuesta del inbox: conecta el namespace WS `/inbox` una sola vez
 * y orquesta lista + panel. `initialConversationId` habilita el deep-link
 * de `/workspace/inbox/[id]`.
 */
export function InboxView({ initialConversationId }: { initialConversationId?: string }) {
  const { connected, commands } = useInboxSocket()
  const select = useInboxStore((s) => s.select)
  const selectedId = useInboxStore((s) => s.selectedId)

  useEffect(() => {
    if (initialConversationId && selectedId !== initialConversationId) {
      void select(initialConversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId])

  // Maestro-detalle en móvil (<md): se ve la lista o la conversación, no ambas.
  // En md+ conviven lado a lado como en desktop.
  return (
    <div className="flex h-full w-full">
      <InboxList className={cn(selectedId ? "hidden md:flex" : "flex")} />
      <ConversationPanel
        className={cn(selectedId ? "flex" : "hidden md:flex")}
        commands={commands}
        socketConnected={connected}
      />
    </div>
  )
}
