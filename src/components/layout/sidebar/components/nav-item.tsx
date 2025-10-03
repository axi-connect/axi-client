import Link from "next/link";
import { useState } from "react";
import { SidebarNavItem } from "../types";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

import {
    SidebarMenuSub,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/layout/sidebar/core"

export default function NavItemNode({ item }: { item: SidebarNavItem }) {
  const pathname = usePathname()
  const isDirectActive = !!(item.url && pathname === item.url)
  const hasChildren = !!(item.children && item.children.length)
  const hasActiveChild = hasChildren && item.children!.some((c) => c.url && c.url === pathname)
  const [open, setOpen] = useState<boolean>(() => hasActiveChild)
  
  return (
    <SidebarMenuItem>
      {hasChildren ? (
        <>
          <SidebarMenuButton
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={open ? "data-[state=open]:bg-accent" : undefined}
          >
            {item.icon ? <item.icon /> : null}
            <span className="capitalize">{item.title}</span>
            <ChevronDown className={`ml-auto transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
          </SidebarMenuButton>
          {open && (
            <SidebarMenuSub>
              {item.children!
              .slice() 
              .sort((a, b) => {
                if (a.title.length !== b.title.length) return a.title.length - b.title.length
                return a.title.localeCompare(b.title)
              })
              .map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton asChild isActive={pathname === (child.url || "")}>
                    <Link href={child.url || "#"}>
                      {child.icon ? <child.icon /> : null}
                      <span className="capitalize">{child.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </>
      ) : (
        <SidebarMenuButton asChild isActive={isDirectActive}>
          <Link href={item.url || "#"}>
            {item.icon ? <item.icon /> : null}
            <span className="capitalize">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}