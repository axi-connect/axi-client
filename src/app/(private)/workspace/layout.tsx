"use client"

import type { ReactNode } from "react"
import { SidebarProvider } from "@/shared/components/layout/sidebar/core"
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

  return (
    // Vista de aplicación full-bleed acotada al viewport: 52px = altura del
    // PrivateHeader (mismo valor que asume el shell privado). Con la altura
    // topada aquí, el ÚNICO scroll de cada área es el interno (timeline,
    // lista, canales) — sin scroll de página.
    <div className="flex w-full h-[calc(100svh-52px)] min-h-0 overflow-hidden">
      {/* min-h-0 neutraliza el min-h-svh base del SidebarProvider anidado
          (causa del desborde de ~52px): la columna de canales queda topada
          y su SidebarContent scrollea internamente. */}
      <SidebarProvider className="w-max h-full min-h-0">
        <WorkspaceSidebar />
      </SidebarProvider>
      <div className="overflow-hidden w-full h-full min-h-0">
        {children}
        {modal}
      </div>
      <ChannelDetailSheet />
    </div>
  )
}
