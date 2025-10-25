"use client"

import { InboxIcon } from "lucide-react"
import { useChannelsStore } from "@/modules/channels/infrastructure/store/channels.store"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/layout/sidebar/core"

export function InboxSection() {
  const { selectedView, setView } = useChannelsStore()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Inbox</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={selectedView === "inbox"}
              onClick={() => setView("inbox")}
            >
              <InboxIcon />
              <span>Inbox</span>
            </SidebarMenuButton>
            {/* TODO: Add counts */}
            <SidebarMenuBadge>{0}</SidebarMenuBadge>
          </SidebarMenuItem>
          {/* Future: Add more inbox views when needed */}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default InboxSection
