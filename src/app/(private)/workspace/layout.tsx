"use client"

import type { ReactNode } from "react"
import { SidebarProvider } from "@/shared/components/layout/sidebar/core"
import WorkspaceSidebar from "@/modules/workspace/ui/sidebar/WorkspaceSidebar"
import { ChannelsProvider } from "@/modules/channels/infrastructure/store/channels.context"

export default function WorkspacesLayout({ children, modal }: { children: ReactNode, modal: ReactNode }) {
  return (
    <ChannelsProvider>
      <div className="flex w-[calc(100%+3rem)] -m-6">
        <SidebarProvider className="w-max">
          <WorkspaceSidebar />
        </SidebarProvider>
        <div className="overflow-hidden w-full">
          {children}
          {modal}
        </div>
      </div>
    </ChannelsProvider>
  )
}