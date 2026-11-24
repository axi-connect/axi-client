"use client";

/**
 * Barra lateral de la consola (rediseño F1, mockup aprobado): seis grupos
 * —Inicio · Clientes · Dinero · Operación · IA · Control—, ordenados por
 * largo dentro de cada uno (`PLATFORM_NAV_SECTIONS`), sobre los primitivos
 * compartidos de `sidebar/core` (modo icono con ⌘B, rail, hoja en el
 * celular). Arriba, el buscador (Ctrl K); abajo, la cuenta: correo, cuenta
 * atrás de la sesión, el tema (en UN solo sitio) y «Salir de la consola».
 *
 * Contadores a la derecha de cada ítem:
 * - Empresas: cuántas hay (`meta.total` de la lista, la misma query de siempre).
 * - Puesta en marcha: cuántas entrevistas piden atención (`needsAttention`,
 *   el mismo cálculo que el aviso de esa vista).
 * - Analytics: alertas disparadas (poll 60 s pausado con el re-login, «99+»).
 * Los dos de atención llevan el punto ámbar; el de Empresas es solo una cifra.
 */
import { useMemo } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle, LogOut, Search } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import { SidebarCollapseButton } from "@/shared/components/layout/sidebar/components/sidebar-collapse-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
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
  SidebarRail,
  useSidebar,
} from "@/shared/components/layout/sidebar/core";
import { isNavItemActive, PLATFORM_NAV_SECTIONS } from "../../domain/navigation";
import { needsAttention } from "../../domain/intake";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { useTriggeredAlertsCount } from "../../infrastructure/api/hooks/use-analytics";
import { useIntakeSessionsQuery } from "../../infrastructure/api/hooks/use-intake";
import { useTenantsQuery } from "../../infrastructure/api/hooks/use-tenants";
import { NAV_ICONS } from "./nav-icons";
import { SessionCountdownChip } from "./SessionCountdownChip";
import { usePlatformCommand } from "./PlatformCommand";

/** «99+» a partir de cien. */
export function compactCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

type NavCount = { value: number; attention: boolean; title: string };

/** Los contadores del menú. Cada uno sale de una query que la consola ya usa (sin endpoints nuevos). */
function useNavCounts(): Record<string, NavCount | undefined> {
  const tenants = useTenantsQuery();
  const alerts = useTriggeredAlertsCount();
  const intake = useIntakeSessionsQuery({});
  const attention = useMemo(() => (intake.data?.data ?? []).filter((row) => needsAttention(row)).length, [intake.data]);
  const tenantsTotal = tenants.data?.meta.total;
  return {
    "/platform/tenants":
      tenantsTotal !== undefined ? { value: tenantsTotal, attention: false, title: `${String(tenantsTotal)} empresas` } : undefined,
    "/platform/intake": attention > 0 ? { value: attention, attention: true, title: "Entrevistas que piden atención" } : undefined,
    "/platform/analytics": alerts.data ? { value: alerts.data, attention: true, title: "Alertas disparadas" } : undefined,
  };
}

/** Lo que va a la derecha del ítem: el spinner mientras navega o el contador. */
function NavTrailing({ count }: { count: NavCount | undefined }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span aria-hidden="true" className="ml-auto animate-delayed-fade-in group-data-[collapsible=icon]:hidden">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
      </span>
    );
  }
  if (!count) return null;
  return (
    <span
      title={count.title}
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted-foreground tabular-nums group-data-[collapsible=icon]:hidden"
    >
      {count.attention ? <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" /> : null}
      {compactCount(count.value)}
      <span className="sr-only">{count.attention ? `, ${count.title.toLowerCase()}` : ""}</span>
    </span>
  );
}

function SearchButton() {
  const { setOpen } = usePlatformCommand();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Buscar en la consola"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-background px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring",
        collapsed && "size-8 justify-center p-0",
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate text-left">Buscar</span>
          <kbd className="shrink-0 rounded-md border border-border px-1.5 font-mono text-[11px] whitespace-nowrap">Ctrl K</kbd>
        </>
      )}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>
        Buscar <span className="ml-2 text-muted-foreground">Ctrl K</span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Iniciales del correo («laura@axi…» → «LA»). */
export function initialsFromEmail(email: string | undefined | null): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0]![0]}${parts[1]![0]}` : local.slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function PlatformSidebar() {
  const pathname = usePathname() ?? "";
  const { state, isMobile } = useSidebar();
  const { session, logout } = usePlatformAuth();
  const counts = useNavCounts();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" aria-label="Navegación de la plataforma">
      <SidebarHeader className="gap-3 px-3 pt-4 pb-1 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0">
          <BrandMark className="size-7 shrink-0" aria-label="Axi Connect" />
          <span className="font-heading text-lg leading-none font-bold tracking-tight group-data-[collapsible=icon]:hidden">axi</span>
          <span className="ml-auto inline-flex h-6 shrink-0 items-center rounded-full border border-border px-2.5 text-[11.5px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            Plataforma
          </span>
          <SidebarCollapseButton />
        </div>
        <SearchButton />
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll gap-1 pt-1">
        {PLATFORM_NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.title ?? "inicio"} className="py-1">
            {section.title !== null ? (
              <SidebarGroupLabel className="h-7 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {section.title}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                {section.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const active = isNavItemActive(item.path, pathname);
                  const count = counts[item.path];
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "relative h-[34px] gap-2.5 rounded-[10px] px-2.5 text-[13.5px] text-foreground/85 [&>svg]:text-muted-foreground",
                          "data-[active=true]:text-foreground data-[active=true]:[&>svg]:text-brand",
                          "data-[active=true]:before:absolute data-[active=true]:before:top-1/2 data-[active=true]:before:left-0 data-[active=true]:before:h-4 data-[active=true]:before:w-0.5 data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand",
                        )}
                      >
                        <Link href={item.path} aria-current={active ? "page" : undefined}>
                          {Icon ? <Icon aria-hidden="true" /> : null}
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <NavTrailing count={count} />
                          {collapsed && count?.attention ? (
                            <span aria-hidden="true" className="absolute top-1 right-1 size-1.5 rounded-full bg-warning" />
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 pt-2 pb-3 group-data-[collapsible=icon]:px-2">
        <div
          className={cn(
            "flex items-center gap-2.5 border-t border-border pt-3",
            collapsed && "flex-col gap-1.5",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
              collapsed && "hidden",
            )}
          >
            {initialsFromEmail(session?.email)}
          </span>
          <div className={cn("flex min-w-0 flex-1 flex-col leading-tight", collapsed && "hidden")}>
            <span className="truncate text-[13px] font-medium" title={session?.email ?? undefined}>
              {session?.email ?? ""}
            </span>
            <SessionCountdownChip />
          </div>
          <ThemeToggle variant="compact" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={logout}
                aria-label="Salir de la consola"
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} sideOffset={6}>
              Salir de la consola
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
