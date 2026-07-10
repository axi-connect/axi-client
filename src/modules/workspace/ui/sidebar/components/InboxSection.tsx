"use client"

import { useEffect } from "react"
import { InboxIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
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
  const counts = useInboxStore((s) => s.counts)
  const fetchCounts = useInboxStore((s) => s.fetchCounts)

  useEffect(() => {
    void fetchCounts()
  }, [fetchCounts])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Inbox</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname?.startsWith("/workspace/inbox") ?? false}
              onClick={() => router.push("/workspace/inbox")}
            >
              <InboxIcon />
              <span>Inbox</span>
            </SidebarMenuButton>
            {(counts?.unread_total ?? 0) > 0 && (
              <SidebarMenuBadge>{counts?.unread_total}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default InboxSection
