"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useSession } from '@/shared/auth/auth.hooks'
import { ChevronDown, BookOpen, HelpCircle, FolderOpen, LayoutDashboard, Users, Lock, Building } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar/core"

// Types for configurable navigation
export type SidebarNavItem = {
  title: string
  url?: string
  icon?: LucideIcon
  children?: SidebarNavItem[]
}

export type SidebarSection = {
  label: string
  items: SidebarNavItem[]
}

// Configurable structure: groups, items and nested children
const sections: SidebarSection[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Administración",
        icon: FolderOpen,
        children: [
          { title: "Roles", url: "/roles", icon: Lock },
          { title: "Empresas", url: "/companies", icon: Building },
          { title: "Usuarios", url: "/users", icon: Users },
        ],
      },
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Modelos", url: "#", icon: Users },
    ],
  },
  {
    label: "Recursos",
    items: [
      { title: "Guías y API", url: "#", icon: BookOpen },
      { title: "Ayuda", url: "#", icon: HelpCircle },
    ],
  },
]

function NavItemNode({ item }: { item: SidebarNavItem }) {
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
            <span>{item.title}</span>
            <ChevronDown className={`ml-auto transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
          </SidebarMenuButton>
          {open && (
            <SidebarMenuSub>
              {item.children!.map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton asChild isActive={pathname === (child.url || "")}>
                    <Link href={child.url || "#"}>
                      {child.icon ? <child.icon /> : null}
                      <span>{child.title}</span>
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
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  function pad2(n: number) {
    return n.toString().padStart(2, "0")
  }

  function useCountdown(target: Date) {
    const [now, setNow] = useState<Date>(new Date())
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000)
      return () => clearInterval(id)
    }, [])
    const diff = Math.max(0, target.getTime() - now.getTime())
    const dayMs = 24 * 60 * 60 * 1000
    const hourMs = 60 * 60 * 1000
    const minMs = 60 * 1000
    const days = Math.floor(diff / dayMs)
    const hours = Math.floor((diff % dayMs) / hourMs)
    const minutes = Math.floor((diff % hourMs) / minMs)
    return { days, hours, minutes }
  }

  const [mounted, setMounted] = useState(false)
  const launchDate = new Date(2025, 10, 1, 0, 0, 0)
  const { user, isAuthenticated, status } = useSession()
  const { days, hours, minutes } = useCountdown(launchDate)

  useEffect(() => { 
    console.log(user, isAuthenticated, status)
    setMounted(true) 
  }, [])

  function TimeBox({ value, label }: { value: string; label: string }) {
    return (
      <div className="flex flex-col items-center">
        <div className="bg-accent text-accent-foreground rounded-md px-2 py-1 text-sm font-semibold tabular-nums">
          {value}
        </div>
        <div className="mt-1 text-[10px] text-foreground/70">{label}</div>
      </div>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-brand-gradient" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Axi Connect</span>
            <span className="text-xs text-foreground/70">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((it) => (
                  <NavItemNode key={it.title} item={it} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <div className="px-3 pb-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="mb-2 text-xs font-medium text-foreground/80">
            Lanzamiento Axi Connect <span aria-hidden>🚀</span>
          </div>
          <div className="flex items-center gap-2">
            <TimeBox value={mounted ? days.toString() : "--"} label="días" />
            <span className="text-foreground/50">:</span>
            <TimeBox value={mounted ? pad2(hours) : "--"} label="horas" />
            <span className="text-foreground/50">:</span>
            <TimeBox value={mounted ? pad2(minutes) : "--"} label="min" />
          </div>
        </div>
      </div>

      <SidebarFooter className="px-3 py-2">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
          <div className="size-8 rounded-full bg-foreground/20" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-foreground/70">{user?.email}</div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}