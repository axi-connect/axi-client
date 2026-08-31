"use client";

/**
 * Sidebar del panel de plataforma: navegación ESTÁTICA (6 secciones, sin
 * RBAC) sobre los primitivos compartidos de `shared/components/layout/
 * sidebar/core` — misma materia (glass) y comportamiento (colapso, rail,
 * atajo ⌘B) que el panel de tenant, con el badge violeta que identifica la
 * consola interna. Footer: email del admin + countdown de sesión + salir.
 */
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AudioLines,
  Building2,
  CircleDollarSign,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Receipt,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/shared/components/layout/sidebar/core";
import { PLATFORM_NAV } from "../../domain/navigation";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { useTriggeredAlertsCount } from "../../infrastructure/api/hooks/use-analytics";
import { SessionCountdownChip } from "./SessionCountdownChip";

/** Badge de alertas disparadas junto a "Analytics" (poll 60 s compartido
    con el tab de alertas — misma query key). Oculto si 0 o sin datos. */
function AlertsBadge() {
  const { data: count } = useTriggeredAlertsCount();
  if (!count) return null;
  return (
    <SidebarMenuBadge className="bg-warning/15 font-medium text-warning tabular-nums">
      {count > 99 ? "99+" : count}
    </SidebarMenuBadge>
  );
}

/** Mapa local de iconos del nav de plataforma (el diccionario de
    `core/lib/icons.ts` es cerrado al nav del backend tenant). */
const NAV_ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  layers: Layers,
  "circle-dollar-sign": CircleDollarSign,
  "audio-lines": AudioLines,
  receipt: Receipt,
  "scroll-text": ScrollText,
  activity: Activity,
  "flask-conical": FlaskConical,
};

/** Indicador de navegación pendiente (mismo patrón que el sidebar de tenant). */
function NavLinkSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden="true" className="ml-auto animate-delayed-fade-in">
      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
    </span>
  );
}

export function PlatformSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { session, logout } = usePlatformAuth();

  const isActive = (path: string) =>
    path === "/platform" ? pathname === "/platform" : pathname === path || pathname.startsWith(path + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-2">
        <div className="flex items-center gap-2">
          <BrandMark className="size-8 shrink-0" aria-label="Axi Connect" />
          <div className="flex flex-col items-start gap-0.5 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium">Axi Connect</span>
            <Badge className="border-accent-violet/40 bg-accent-violet/10 px-1.5 py-0 text-[10px] uppercase tracking-wide text-accent-violet" variant="outline">
              Plataforma
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {PLATFORM_NAV.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label}>
                      <Link href={item.path}>
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                        <NavLinkSpinner />
                      </Link>
                    </SidebarMenuButton>
                    {item.path === "/platform/analytics" && <AlertsBadge />}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-2">
        <div className={cn("flex justify-center pb-1", state === "collapsed" && "hidden")}>
          <ThemeToggle />
        </div>
        <div className={cn("flex items-center gap-2 p-2", state === "collapsed" && "flex-col p-1")}>
          <div className={cn("min-w-0 flex-1 space-y-1", state === "collapsed" && "hidden")}>
            <div className="truncate text-xs text-foreground/70">{session?.email ?? ""}</div>
            <SessionCountdownChip />
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Salir de la consola"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
