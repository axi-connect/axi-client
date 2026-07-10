import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { SidebarNavItem } from "../types";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  SidebarMenuSub,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/shared/components/layout/sidebar/core"

/**
 * Indicador de navegación pendiente (debe renderizarse DENTRO de un <Link>).
 * `useLinkStatus` expone `pending` mientras la ruta destino resuelve; la
 * aparición se difiere ~150ms vía CSS (`animate-delayed-fade-in`) para no
 * parpadear en navegaciones instantáneas.
 */
function NavLinkSpinner() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span aria-hidden="true" className="ml-auto animate-delayed-fade-in">
      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
    </span>
  )
}

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
              {/* El orden viene resuelto por sort_order desde /me/navigation. */}
              {item.children!.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton asChild isActive={pathname === (child.url || "")}>
                    <Link href={child.url || "#"}>
                      {child.icon ? <child.icon /> : null}
                      <span className="capitalize">{child.title}</span>
                      <NavLinkSpinner />
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
            <NavLinkSpinner />
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}
