"use client"

import Link from "next/link"
import { useRef, useState, type ReactNode } from "react"

import { cn } from "@/core/lib/utils"
import type { SidebarNavItem } from "../types"
import { Separator } from "@/shared/components/ui/separator"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover"

/** Retardo de apertura por hover: evita que el panel salte al pasar de largo. */
const HOVER_OPEN_DELAY_MS = 120

/**
 * Ítem navegable del flyout. Comparte el lenguaje visual de la fila del
 * sidebar (radio de control, accent en hover, barra coral en el activo) pero es
 * plano: dentro del panel la jerarquía la dan las sub-cabeceras.
 */
function FlyoutLink({
  item,
  isActive,
  onNavigate,
}: {
  item: SidebarNavItem
  isActive: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={item.url ?? "#"}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive &&
          "bg-accent font-medium text-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand before:content-['']",
      )}
    >
      <span className="truncate">{item.title}</span>
    </Link>
  )
}

/**
 * Panel flotante con los descendientes de un grupo, para el sidebar en modo
 * icono. Sin esto la fila de un grupo colapsado es un click muerto: los
 * subniveles llevan `group-data-[collapsible=icon]:hidden` en los primitivos.
 *
 * Se abre por hover (con retardo) y por click/teclado — Radix Popover ya aporta
 * el cierre con Escape, el foco y el `.glass` con las transiciones de marca.
 * El árbol se aplana a dos planos: enlaces directos primero y cada subgrupo
 * bajo su propia cabecera.
 */
export function NavFlyout({
  item,
  activeTrail,
  children,
}: {
  item: SidebarNavItem
  activeTrail: string[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  const openLater = () => {
    cancel()
    timer.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY_MS)
  }
  const closeNow = () => {
    cancel()
    setOpen(false)
  }

  const isActive = (code: string) => activeTrail[activeTrail.length - 1] === code
  const leaves = item.children.filter((child) => child.children.length === 0)
  const groups = item.children.filter((child) => child.children.length > 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onPointerEnter={openLater} onPointerLeave={closeNow}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onPointerEnter={cancel}
        onPointerLeave={closeNow}
        className="w-56 p-1.5"
      >
        {/* Cabecera: si el grupo tiene página propia es navegable; si es un
            grupo puro, solo titula el panel. */}
        {item.url ? (
          <Link
            href={item.url}
            onClick={closeNow}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {item.icon ? <item.icon className="size-4 text-brand" /> : null}
            <span className="truncate">{item.title}</span>
          </Link>
        ) : (
          <div className="flex h-8 items-center gap-2 px-2 text-sm font-medium">
            {item.icon ? <item.icon className="size-4 text-brand" /> : null}
            <span className="truncate">{item.title}</span>
          </div>
        )}

        <Separator className="my-1" />

        {leaves.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {leaves.map((child) => (
              <FlyoutLink
                key={child.id}
                item={child}
                isActive={isActive(child.code)}
                onNavigate={closeNow}
              />
            ))}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.id} className="mt-1 flex flex-col gap-0.5">
            <div className="px-2 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.title}
            </div>
            {group.children.map((child) => (
              <FlyoutLink
                key={child.id}
                item={child}
                isActive={isActive(child.code)}
                onNavigate={closeNow}
              />
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
