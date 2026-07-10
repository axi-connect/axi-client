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
    <div className="flex w-[calc(100%+3rem)] -m-6">
      <SidebarProvider className="w-max">
        <WorkspaceSidebar />
      </SidebarProvider>
      <div className="overflow-hidden w-full">
        {children}
        {modal}
      </div>
      <ChannelDetailSheet />
    </div>
  )
}
