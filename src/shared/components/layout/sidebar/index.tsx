"use client"

import { cn } from "@/core/lib/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronsUpDown, LogOut } from "lucide-react"
import NavItemNode from './components/nav-item'
import { mapNavigation } from "./nav-tree"
import { findActiveTrail } from "./nav-active"
import { useSession } from '@/shared/auth/auth.hooks'
import { Avatar } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { BrandMark } from "@/shared/components/ui/brand-mark"
import { ThemeToggle } from "@/shared/components/layout/theme-toggle"
import {
  useSidebar,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_NAV_COOKIE_NAME,
} from "@/shared/components/layout/sidebar/core"
import { SidebarNavSkeleton } from "./components/nav-skeleton"
import type { NavigationNodeDTO, SidebarNavItem } from "./types"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu"

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

type AppSidebarProps = {
  /** Identidad del tenant (logo/nombre de empresa) para el header. Se inyecta
      desde la capa app — shared no importa de modules (arquitectura §3.3). */
  identity?: React.ReactNode
  /**
   * Árbol precargado en el layout server. Con él el menú sale completo en el
   * primer paint: ni skeleton ni round-trip del browser a `/api/auth/sidebar`.
   * Si el prefetch falla llega `undefined` y se cae al fetch cliente.
   */
  initialItems?: NavigationNodeDTO[]
  /** Grupos abiertos según la cookie, leída también en el server. */
  defaultOpenCodes?: string[]
}

export function AppSidebar({ identity, initialItems, defaultOpenCodes = [] }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const { user, status } = useSession()
  const [items, setItems] = useState<SidebarNavItem[]>(() =>
    initialItems ? mapNavigation(initialItems) : [],
  )
  // Con árbol precargado no hay nada que cargar: el skeleton se salta.
  const [loaderSidebar, setLoaderSidebar] = useState(initialItems === undefined)
  const [errorSidebar, setErrorSidebar] = useState(false)
  // Incrementarlo re-dispara el fetch del menú (botón "Reintentar").
  const [reloadKey, setReloadKey] = useState(0)
  const [openCodes, setOpenCodes] = useState<Set<string>>(() => new Set(defaultOpenCodes))

  useEffect(() => {
    if (status !== "authenticated") return
    // El prefetch del server ya resolvió el menú; el fetch cliente queda solo
    // como fallback y para el botón "Reintentar".
    if (initialItems !== undefined && reloadKey === 0) return
    let ignore = false
    async function loadSidebar() {
      try {
        setLoaderSidebar(true)
        setErrorSidebar(false)
        const res = await fetch("/api/auth/sidebar", { cache: "no-store" })
        if (!res.ok) throw new Error(`sidebar ${res.status}`)
        const data: NavigationNodeDTO[] = await res.json()
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
  }, [status, reloadKey, initialItems])

  const activeTrail = useMemo(() => findActiveTrail(items, pathname), [items, pathname])

  /** Códigos que son grupo (tienen hijos): los únicos que pueden estar abiertos. */
  const groupCodes = useMemo(() => {
    const codes = new Set<string>()
    const walk = (nodes: SidebarNavItem[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          codes.add(node.code)
          walk(node.children)
        }
      }
    }
    walk(items)
    return codes
  }, [items])

  // La rama activa se abre siempre, aunque no estuviera en la cookie: entrar
  // por URL directa o por un redirect debe dejar el grupo visible.
  // Solo se añaden los ANCESTROS (códigos de grupo): meter la hoja activa
  // ensuciaría la cookie con un código por cada página visitada.
  useEffect(() => {
    const ancestors = activeTrail.filter((code) => groupCodes.has(code))
    if (ancestors.length === 0) return
    setOpenCodes((current) => {
      const missing = ancestors.filter((code) => !current.has(code))
      if (missing.length === 0) return current
      const next = new Set(current)
      for (const code of missing) next.add(code)
      return next
    })
  }, [activeTrail, groupCodes])

  const toggleGroup = useCallback((code: string) => {
    setOpenCodes((current) => {
      const next = new Set(current)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      // Se persiste por `code` (estable entre entornos, a diferencia del uuid).
      document.cookie = `${SIDEBAR_NAV_COOKIE_NAME}=${[...next].join(",")}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`
      return next
    })
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-2">
        {/* Identidad del tenant inyectada desde la capa app; en colapsado el
            texto se oculta solo (group-data) y queda el logo. */}
        {identity ?? (
          <div className="flex items-center gap-2">
            <BrandMark className="size-8 shrink-0" aria-label="Axi Connect" />
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium">axi connect</span>
              <span className="text-xs text-foreground/70 capitalize">{user?.role?.name ?? ""}</span>
            </div>
          </div>
        )}
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
              <SidebarMenu aria-label="Navegación principal">
                {items.map((item) => (
                  <NavItemNode
                    key={item.id}
                    item={item}
                    activeTrail={activeTrail}
                    openCodes={openCodes}
                    onToggle={toggleGroup}
                  />
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
          /* Menú de cuenta: la fila del usuario es el trigger; "Cerrar sesión"
             navega a /auth/logout (soft) → modal de confirmación interceptado. */
          <DropdownMenu className="w-full">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Cuenta de ${user.name}`}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent",
                  "focus-visible:outline-2 focus-visible:outline-ring",
                  state === "collapsed" && "justify-center p-1",
                )}
              >
                <Avatar
                  src={user.avatar_url}
                  alt={user.name ? `Avatar de ${user.name}` : "Avatar"}
                  fallback={user.name}
                  size={32}
                />
                <div className={cn("min-w-0 flex-1", state === "collapsed" && "hidden")}>
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs text-foreground/70">{user.email ?? ""}</div>
                </div>
                <ChevronsUpDown
                  aria-hidden="true"
                  className={cn("size-4 shrink-0 text-muted-foreground", state === "collapsed" && "hidden")}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
                <div className="truncate">{user.email ?? ""}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive hover:text-destructive focus:text-destructive"
                onClick={() => router.push("/auth/logout")}
              >
                <LogOut aria-hidden="true" className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
