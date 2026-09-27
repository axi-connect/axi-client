"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/components/ui/sheet"
import { WorkspaceRail } from "@/modules/workspace/ui/rail/WorkspaceRail"
import { ChannelDetailSheet } from "@/modules/channels/ui/components/ChannelDetailSheet"
import { useChannelsRealtime } from "@/modules/channels/infrastructure/hooks/use-channels-realtime"

/**
 * Shell del workspace: monta la conexión realtime del namespace `/channels`
 * (QR y estados en vivo) y el panel de detalle de canal. El namespace
 * `/inbox` lo monta el módulo inbox en sus vistas.
 */
export default function WorkspacesLayout({ children }: { children: ReactNode }) {
  useChannelsRealtime()

  // En <lg el sidebar de canales no cabe junto a la lista + conversación:
  // pasa a un drawer que abre el botón del inbox vía CustomEvent (bus §9).
  const [channelsOpen, setChannelsOpen] = useState(false)
  useEffect(() => {
    const open = () => setChannelsOpen(true)
    window.addEventListener("workspace:channels-drawer:open", open)
    return () => window.removeEventListener("workspace:channels-drawer:open", open)
  }, [])

  return (
    // Vista de aplicación full-bleed acotada a la altura disponible, que
    // reparte el flex del shell privado (DESIGN-SYSTEM §4.2) — nada de restar
    // la altura del header a mano. Con la altura topada aquí, el ÚNICO scroll
    // de cada área es el interno (timeline, lista, canales).
    // `data-app-view`: le dice al shell privado que esta vista es de
    // aplicación y no debe crecer, para que el scroll se quede dentro (el
    // timeline del chat) en vez de irse al panel — DESIGN-SYSTEM §4.2.
    <div data-app-view className="flex min-h-0 w-full flex-1 overflow-hidden">
      {/* lg+: la columna de vistas y canales, desplegada o en riel (Inbox
          premium F1). Es un scroller propio: su lista crece sin empujar al chat. */}
      <WorkspaceRail className="hidden lg:flex" />

      {/* <lg: las mismas vistas y canales en un drawer lateral, siempre desplegadas. */}
      <Sheet open={channelsOpen} onOpenChange={setChannelsOpen}>
        <SheetContent side="left" className="flex w-76 flex-col p-0 lg:hidden">
          <SheetHeader className="px-5 pt-5 pb-1">
            <SheetTitle className="font-heading text-xl">Inbox</SheetTitle>
            <SheetDescription className="sr-only">Vistas de la bandeja y canales del workspace.</SheetDescription>
          </SheetHeader>
          <WorkspaceRail variant="drawer" onNavigate={() => setChannelsOpen(false)} className="min-h-0 flex-1" />
        </SheetContent>
      </Sheet>

      {/* `flex-1` y no `w-full h-full`: la altura de este subárbol ya no viene
          de un número (antes era `h-[calc(100svh-52px)]` en la raíz) sino del
          reparto flex, y contra un padre de altura `auto` un porcentaje
          resuelve a `auto` — DESIGN-SYSTEM §4.2. Es `flex` para que la vista de
          dentro pueda repartir con `flex-1` en vez de volver a porcentajes. */}
      <div className="flex min-w-0 min-h-0 flex-1 overflow-hidden">{children}</div>
      <ChannelDetailSheet />
    </div>
  )
}
