"use client"

import Image from "next/image";
import * as Icons from "lucide-react"
import { useEffect, useState } from "react";
import Loader from "@/components/layout/loader"
import NavItemNode from './components/nav-item';
import { useSession } from '@/shared/auth/auth.hooks'
import { SidebarSection, SidebarSectionDTO, SidebarItemDTO } from "./types";

import {
  Sidebar,
  SidebarMenu,
  SidebarRail,
  SidebarGroup,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/layout/sidebar/core"

function iconFromString(name?: string): Icons.LucideIcon | undefined {
  if (!name) return undefined
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name]
  return Icon
}

function mapDtoToSections(dto: SidebarSectionDTO[]): SidebarSection[] {
  const mapItem = (it: SidebarItemDTO): any => ({
    title: it.title,
    url: it.url?.startsWith("/") ? it.url : it.url ? `/${it.url}` : undefined,
    icon: iconFromString(it.icon),
    children: it.children?.map(mapItem) || [],
  })
  return dto.map((s) => ({ label: s.label, items: s.items.map(mapItem) }))
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
  const [loaderSidebar, setLoaderSidebar] = useState(true)
  const { days, hours, minutes } = useCountdown(launchDate)
  const [sections, setSections] = useState<SidebarSection[] | null>(null)

  useEffect(() => {setMounted(true)}, [])

  useEffect(() => {
    if(status != "authenticated") return
    let ignore = false
    async function loadSidebar() {
      try {
        setLoaderSidebar(true)
        const res = await fetch("/api/auth/sidebar", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!ignore) setSections(mapDtoToSections(data))
      } catch (error) {
        console.error("Error loading sidebar", error)
        // ignore errors to avoid breaking layout
      } finally {
        setLoaderSidebar(false)
      }
    }
    loadSidebar()
    return () => { ignore = true }
  }, [status])

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
            <span className="text-sm font-medium">{user?.company?.name ?? "Cargando..."}</span>
            <span className="text-xs text-foreground/70">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>
        
      <SidebarContent className="sidebar-scroll">
        {
          loaderSidebar ? <Loader /> :
          <>
            {(sections || []).map((section) => (
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

            {/* Lanzamiento Axi Connect */}
            <div className="mt-4 px-3 pb-2">
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
          </>
        }
      </SidebarContent>

      <SidebarFooter className="px-3 py-2">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
          <div className="flex items-center justify-start">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user?.name ? `Avatar de ${user?.name}` : "Avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover bg-muted"
                onError={() => { /* si falla, mostramos fallback */ }}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user?.name ?? "Iniciando sesión..."}</div>
            <div className="truncate text-xs text-foreground/70">{user?.email ?? "Extrayendo datos..."}</div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}