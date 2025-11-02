"use client"

import type { ReactNode } from "react"
import { SidebarProvider } from "@/shared/components/layout/sidebar/core"
import WorkspaceSidebar from "@/modules/workspace/ui/sidebar/WorkspaceSidebar"
import { WebSocketProvider } from "@/modules/channels/infrastructure/store/websocket.context"

export default function WorkspacesLayout({ children, modal }: { children: ReactNode, modal: ReactNode }) {
  return (
    <WebSocketProvider>
      <div className="flex w-[calc(100%+3rem)] -m-6">
        <SidebarProvider className="w-max">
          <WorkspaceSidebar />
        </SidebarProvider>
        <div className="overflow-hidden w-full">
          {children}
          {modal}
        </div>
      </div>
    </WebSocketProvider>
  )
}