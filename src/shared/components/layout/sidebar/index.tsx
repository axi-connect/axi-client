"use client"

import Image from "next/image"
import { cn } from "@/core/lib/utils"
import { useEffect, useState } from "react"
import NavItemNode from './components/nav-item'
import { iconFromString } from "@/core/lib/icons"
import { resolveNavPath } from "@/core/config/routes"
import { useSession } from '@/shared/auth/auth.hooks'
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ThemeToggle } from "@/shared/components/layout/theme-toggle"
import { useSidebar } from "@/shared/components/layout/sidebar/core"
import { SidebarNavSkeleton } from "./components/nav-skeleton"
import type { NavigationChildDTO, NavigationItemDTO, SidebarNavItem } from "./types"

import {
  Sidebar,
  SidebarMenu,
  SidebarRail,
  SidebarGroup,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarGroupContent,
} from "@/shared/components/layout/sidebar/core"

/**
 * Mapea el árbol de `/me/navigation` a la forma de UI: ordena por
 * `sort_order`, resuelve iconos lucide y traduce los paths del backend a las
 * rutas del frontend. Los ítems sin UI (módulos pendientes) se filtran; un
 * padre sin hijos visibles y sin ruta propia también desaparece.
 */
function mapNavigation(items: NavigationItemDTO[]): SidebarNavItem[] {
  const bySortOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

  const mapChild = (child: NavigationChildDTO): SidebarNavItem | null => {
    const url = resolveNavPath(child.path)
    if (!url) return null
    return { id: child.id, title: child.name, url, icon: iconFromString(child.icon) }
  }

  return [...items]
    .sort(bySortOrder)
    .map((item): SidebarNavItem | null => {
      const children = [...item.children]
        .sort(bySortOrder)
        .map(mapChild)
        .filter((child): child is SidebarNavItem => child !== null)
      const url = resolveNavPath(item.path)
      if (!url && children.length === 0) return null
      return {
        id: item.id,
        title: item.name,
        url: url ?? undefined,
        icon: iconFromString(item.icon),
        children,
      }
    })
    .filter((item): item is SidebarNavItem => item !== null)
}

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, status } = useSession()
  const [loaderSidebar, setLoaderSidebar] = useState(true)
  const [errorSidebar, setErrorSidebar] = useState(false)
  const [items, setItems] = useState<SidebarNavItem[]>([])
  // Incrementarlo re-dispara el fetch del menú (botón "Reintentar").
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (status !== "authenticated") return
    let ignore = false
    async function loadSidebar() {
      try {
        setLoaderSidebar(true)
        setErrorSidebar(false)
        const res = await fetch("/api/auth/sidebar", { cache: "no-store" })
        if (!res.ok) throw new Error(`sidebar ${res.status}`)
        const data: NavigationItemDTO[] = await res.json()
        if (!ignore) setItems(mapNavigation(data))
      } catch {
        // El layout no se rompe por un fallo del sidebar; se ofrece reintento.
        if (!ignore) setErrorSidebar(true)
      } finally {
        if (!ignore) setLoaderSidebar(false)
      }
    }
    loadSidebar()
    return () => { ignore = true }
  }, [status, reloadKey])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-2">
        <div className={cn("flex items-center gap-2", state === "collapsed" && "hidden")}>
          <div className="size-8 rounded-md bg-brand-gradient" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">axi connect</span>
            <span className="text-xs text-foreground/70 capitalize">{user?.role?.name ?? ""}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll">
        {loaderSidebar || status === "loading" ? (
          <SidebarNavSkeleton />
        ) : errorSidebar ? (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">No pudimos cargar el menú.</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <NavItemNode key={item.id} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="px-3 py-2">
        <div className={cn("flex justify-center pb-1", state === "collapsed" && "hidden")}>
          <ThemeToggle />
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
            <div className="flex items-center justify-start">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.name ? `Avatar de ${user.name}` : "Avatar"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover bg-muted"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {user.name?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-foreground/70">{user.email ?? ""}</div>
            </div>
          </div>
        ) : (
          /* Sesión aún hidratando: skeleton con la misma forma que el bloque real */
          <div className="flex items-center gap-3 p-2" role="status" aria-label="Cargando usuario">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
