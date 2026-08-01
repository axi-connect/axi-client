"use client"

import { Suspense, useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { useAuth } from "@/shared/auth/auth.hooks"
import { useInboxSocket } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { ContactContextProvider } from "@/modules/inbox/infrastructure/stores/contact-context.context"
import { InboxList } from "./components/InboxList"
import { ConversationPanel } from "./components/ConversationPanel"
import { ContextRail } from "./components/context-rail/ContextRail"
import { ContextPanel } from "./components/context-rail/ContextPanel"
import { CONTEXT_PANELS } from "./components/context-rail/registry"
import { useContextPanel } from "./components/context-rail/use-context-panel"

/**
 * Vista compuesta del inbox: conecta el namespace WS `/inbox` una sola vez
 * y orquesta lista + conversación + rail de contexto. `initialConversationId`
 * habilita el deep-link de `/workspace/inbox/[id]`.
 */
export function InboxView({ initialConversationId }: { initialConversationId?: string }) {
  const { connected, commands } = useInboxSocket()
  const select = useInboxStore((s) => s.select)
  const selectedId = useInboxStore((s) => s.selectedId)
  // Selectores de primitivos: la vista solo re-renderiza al cambiar de contacto
  // o al invalidarse su contexto, no en cada actualización de la conversación.
  const contactId = useInboxStore((s) => s.selected?.contact.id ?? null)
  const contextVersion = useInboxStore((s) =>
    s.selected === null ? 0 : (s.contextVersion[s.selected.contact.id] ?? 0),
  )

  useEffect(() => {
    if (initialConversationId && selectedId !== initialConversationId) {
      void select(initialConversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId])

  // Maestro-detalle en móvil (<md): se ve la lista o la conversación, no ambas.
  // En md+ conviven lado a lado como en desktop.
  return (
    <ContactContextProvider contactId={contactId} version={contextVersion}>
      <div className="flex h-full w-full">
        <InboxList className={cn(selectedId ? "hidden md:flex" : "flex")} />
        {/* min-w-0: sin él el timeline fuerza overflow horizontal al aparecer el rail */}
        <ConversationPanel
          className={cn(selectedId ? "flex" : "hidden md:flex", "min-w-0")}
          commands={commands}
          socketConnected={connected}
        />
        {/* useSearchParams exige frontera Suspense; el rail no es crítico para el chat */}
        <Suspense fallback={null}>
          <ContextSurface />
        </Suspense>
      </div>
    </ContactContextProvider>
  )
}

/**
 * Rail + panel activo. Vive aparte de `InboxView` porque lee `useSearchParams`
 * y debe quedar bajo su propia frontera de Suspense.
 */
function ContextSurface() {
  const { hasPermission } = useAuth()
  const selected = useInboxStore((s) => s.selected)
  const contactId = selected?.contact.id ?? null
  const contextVersion = useInboxStore((s) =>
    contactId !== null ? (s.contextVersion[contactId] ?? 0) : 0,
  )

  const panels = CONTEXT_PANELS.filter(
    (panel) => panel.permission === undefined || hasPermission(panel.permission),
  )
  const { activeId, setActiveId, toggle } = useContextPanel(panels.map((panel) => panel.id))
  const active = panels.find((panel) => panel.id === activeId) ?? null

  // Sin conversación abierta no hay contexto que mostrar.
  if (selected === null || contactId === null) return null

  return (
    <>
      {active !== null && (
        <ContextPanel
          panel={active}
          conversation={selected}
          contactId={contactId}
          contextVersion={contextVersion}
          onClose={() => setActiveId(null)}
        />
      )}
      <ContextRail
        panels={panels}
        activeId={activeId}
        onToggle={toggle}
        className="hidden md:flex"
      />
    </>
  )
}
