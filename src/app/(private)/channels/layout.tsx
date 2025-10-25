"use client"

import type { ReactNode } from "react"
import { SidebarProvider } from "@/shared/components/layout/sidebar/core"
import ChannelSidebar from "@/modules/channels/ui/sidebar/ChannelSidebar"
import { ChannelsProvider } from "@/modules/channels/infrastructure/store/channels.context"

export default function ChannelsLayout({ children, form }: { children: ReactNode, form: ReactNode }) {
  return (
    <ChannelsProvider>
      <div className="flex w-[calc(100%+3rem)] -m-6">
        <SidebarProvider className="w-max">
          <ChannelSidebar />
        </SidebarProvider>
        <div className="overflow-hidden w-full">
          {children}
          {form}
        </div>
      </div>
    </ChannelsProvider>
  )
}