"use client"

import { InboxSection, ChannelSection } from "./components"
import { Sidebar, SidebarContent, SidebarSeparator } from "@/shared/components/layout/sidebar/core"

export default function WorkspaceSidebar() {
  return (
    <Sidebar
      variant="inset"
      side="left"
      collapsible="none"
      className="relative rounded-l-2xl bg-gradient-to-br from-muted/50 to-muted border-r border-border"
    >
      {/* sidebar-scroll: scrollbar de marca cuando la lista de canales excede el alto */}
      <SidebarContent className="sidebar-scroll">
        <InboxSection />
        <SidebarSeparator />
        <ChannelSection />
      </SidebarContent>
    </Sidebar>
  )
}
