"use client"

import { InboxIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
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
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Inbox</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/workspace/inbox"}
              onClick={() => router.push("/workspace/inbox")}
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
