"use client"

import { Suspense, useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { useAuth } from "@/shared/auth/auth.hooks"
import { useEntitlements } from "@/shared/auth/entitlements.hooks"
import { useInboxSocket } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { ContactContextProvider } from "@/modules/inbox/infrastructure/stores/contact-context.context"
import { InboxDayProvider } from "@/modules/inbox/infrastructure/stores/inbox-day.context"
import { InboxList } from "./components/InboxList"
import { ConversationPanel } from "./components/ConversationPanel"
import { ContextRail } from "./components/context-rail/ContextRail"
import { ContextPanel } from "./components/context-rail/ContextPanel"
import { CONTEXT_PANELS, visibleContextPanels } from "./components/context-rail/registry"
import { useContextPanel } from "./components/context-rail/use-context-panel"
import { InboxViewUrlSync } from "./components/list/InboxViewUrlSync"

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

  // Deep-link: el espejo de la URL (`InboxViewUrlSync`, efecto hijo) suele
  // haberla seleccionado ya. Se mira el store, no la captura, para no pedirla dos veces.
  useEffect(() => {
    if (initialConversationId && useInboxStore.getState().selectedId !== initialConversationId) {
      void select(initialConversationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId])

  // Maestro-detalle en móvil (<md): se ve la lista o la conversación, no ambas.
  // En md+ conviven lado a lado como en desktop. `InboxDayProvider` resuelve
  // una vez la cola y el día para la isla, la franja del celular y la lista.
  return (
    <InboxDayProvider>
      <ContactContextProvider contactId={contactId} version={contextVersion}>
        {/* `min-h-0 flex-1`, nunca `h-full`: la altura la reparte el flex del
            shell (DESIGN-SYSTEM §4.2). Con un porcentaje, el timeline crecía
            hasta contener todos los mensajes y el scroll se lo quedaba el panel. */}
        <div className="flex min-h-0 w-full flex-1">
          <InboxList className={cn(selectedId ? "hidden md:flex" : "flex")} commands={commands} />
          {/* min-w-0: sin él el timeline fuerza overflow horizontal al aparecer el rail */}
          <ConversationPanel
            className={cn(selectedId ? "flex" : "hidden md:flex", "min-w-0")}
            commands={commands}
            socketConnected={connected}
          />
          {/* useSearchParams exige frontera Suspense; el rail no es crítico para el chat */}
          <Suspense fallback={null}>
            <InboxViewUrlSync />
            <ContextSurface />
          </Suspense>
        </div>
      </ContactContextProvider>
    </InboxDayProvider>
  )
}

/**
 * Rail + panel activo. Vive aparte de `InboxView` porque lee `useSearchParams`
 * y debe quedar bajo su propia frontera de Suspense.
 */
function ContextSurface() {
  const { hasPermission } = useAuth()
  const { hasCapability, loaded: entitlementsLoaded } = useEntitlements()
  const selected = useInboxStore((s) => s.selected)
  const contactId = selected?.contact.id ?? null
  const contextVersion = useInboxStore((s) =>
    contactId !== null ? (s.contextVersion[contactId] ?? 0) : 0,
  )

  // Sin permiso o sin la capacidad del plan, el panel ni se pinta ni pide nada.
  const panels = visibleContextPanels(CONTEXT_PANELS, { hasPermission, hasCapability, entitlementsLoaded })
  const { activeId, setActiveId, toggle } = useContextPanel(panels.map((panel) => panel.id))
  const active = panels.find((panel) => panel.id === activeId) ?? null

  // Sin conversación abierta no hay contexto que mostrar.
  if (selected === null || contactId === null) return null

  return (
    <>
      {active !== null && (
        <ContextPanel
          // Un panel por id: su hook de cabecera es siempre el mismo.
          key={active.id}
          panel={active}
          panels={panels}
          conversation={selected}
          contactId={contactId}
          contextVersion={contextVersion}
          onClose={() => setActiveId(null)}
          onSelect={setActiveId}
        />
      )}
      <ContextRail
        panels={panels}
        activeId={activeId}
        onToggle={toggle}
        conversation={selected}
        className="hidden md:flex"
      />
    </>
  )
}
