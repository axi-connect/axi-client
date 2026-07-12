"use client"

import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { SidebarProvider } from "@/shared/components/layout/sidebar/core"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/components/ui/sheet"
import WorkspaceSidebar from "@/modules/workspace/ui/sidebar/WorkspaceSidebar"
import { ChannelDetailSheet } from "@/modules/channels/ui/components/ChannelDetailSheet"
import { useChannelsRealtime } from "@/modules/channels/infrastructure/hooks/use-channels-realtime"

/**
 * Shell del workspace: monta la conexión realtime del namespace `/channels`
 * (QR y estados en vivo) y el panel de detalle de canal. El namespace
 * `/inbox` lo monta el módulo inbox en sus vistas.
 */
export default function WorkspacesLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
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
    // Vista de aplicación full-bleed acotada al viewport: 52px = altura del
    // PrivateHeader (mismo valor que asume el shell privado). Con la altura
    // topada aquí, el ÚNICO scroll de cada área es el interno (timeline,
    // lista, canales) — sin scroll de página.
    <div className="flex w-full h-[calc(100svh-52px)] min-h-0 overflow-hidden">
      {/* min-h-0 neutraliza el min-h-svh base del SidebarProvider anidado
          (causa del desborde de ~52px): la columna de canales queda topada
          y su SidebarContent scrollea internamente. Solo inline en lg+. */}
      <SidebarProvider className="hidden w-max h-full min-h-0 lg:flex">
        <WorkspaceSidebar />
      </SidebarProvider>

      {/* <lg: las mismas secciones (inbox/canales/QR) en un drawer lateral. */}
      <Sheet open={channelsOpen} onOpenChange={setChannelsOpen}>
        <SheetContent side="left" className="w-72 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Canales</SheetTitle>
            <SheetDescription>Inbox, canales y códigos QR del workspace.</SheetDescription>
          </SheetHeader>
          <SidebarProvider
            className="w-full h-full min-h-0"
            style={{ "--sidebar-width": "100%" } as CSSProperties}
          >
            <WorkspaceSidebar />
          </SidebarProvider>
        </SheetContent>
      </Sheet>

      <div className="overflow-hidden w-full h-full min-h-0">
        {children}
        {modal}
      </div>
      <ChannelDetailSheet />
    </div>
  )
}
