"use client"

import Link, { useLinkStatus } from "next/link"
import { useId } from "react"
import { ChevronDown, LoaderCircle } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

import { cn } from "@/core/lib/utils"
import { spring } from "@/core/styles/motion"
import type { SidebarNavItem } from "../types"
import { NavFlyout } from "./nav-flyout"
import {
  useSidebar,
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

/** Barra coral de 2px que marca el ítem activo (mockup F0). */
const ACTIVE_BAR =
  "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brand before:content-['']"

/**
 * Chevron de plegado. Es un target SEPARADO del link de la fila: la fila
 * navega a la ruta del padre y esto solo abre/cierra. Por eso lleva su propio
 * `aria-label` y su propia hit-area táctil (`after:-inset-2`, ≥40px en móvil,
 * DESIGN-SYSTEM §10).
 */
function NavChevron({
  open,
  title,
  controls,
  onToggle,
}: {
  open: boolean
  title: string
  controls: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Contraer" : "Expandir"} ${title}`}
      onClick={onToggle}
      className={cn(
        "absolute top-1/2 right-1 z-10 grid size-5 -translate-y-1/2 place-items-center rounded-sm",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        // Agranda el área táctil en móvil sin mover el layout.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
      )}
    >
      <ChevronDown
        aria-hidden="true"
        className={cn("size-4 transition-transform duration-200", open ? "rotate-180" : "rotate-0")}
      />
    </button>
  )
}

type NavItemNodeProps = {
  item: SidebarNavItem
  /** Códigos del ancestro al activo (`findActiveTrail`). */
  activeTrail: string[]
  /** Códigos de los grupos desplegados. */
  openCodes: Set<string>
  onToggle: (code: string) => void
}

/**
 * Fila del sidebar, RECURSIVA: se renderiza a sí misma para cada nivel del
 * árbol. Elige el par de primitivos según la profundidad (nivel 0 usa
 * `SidebarMenuButton`, los subniveles `SidebarMenuSubButton`).
 *
 * Estados que pinta:
 * - **activo** (último código del rastro): fondo `accent` + barra coral + `aria-current`.
 * - **ancestro** (cualquier otro código del rastro): sin fondo, icono en coral
 *   y label `font-medium`; su grupo aparece abierto.
 *
 * En modo icono los subniveles están ocultos por CSS, así que la navegación de
 * los grupos pasa por `NavFlyout`.
 */
export default function NavItemNode({ item, activeTrail, openCodes, onToggle }: NavItemNodeProps) {
  const { state, isMobile } = useSidebar()
  const reduceMotion = useReducedMotion()
  const subId = useId()

  const hasChildren = item.children.length > 0
  const trailIndex = activeTrail.indexOf(item.code)
  const isActive = trailIndex !== -1 && trailIndex === activeTrail.length - 1
  const isAncestor = trailIndex !== -1 && !isActive
  const open = openCodes.has(item.code)
  const isCollapsedRail = state === "collapsed" && !isMobile

  const Item = item.depth === 0 ? SidebarMenuItem : SidebarMenuSubItem
  const Button = item.depth === 0 ? SidebarMenuButton : SidebarMenuSubButton

  const rowClassName = cn(
    "relative",
    isActive && ACTIVE_BAR,
    isAncestor && "font-medium [&>svg]:text-brand",
    hasChildren && "pr-8",
  )

  // Contenido común de la fila (el icono solo existe en el nivel 0).
  const label = (
    <>
      {item.icon ? <item.icon /> : null}
      <span>{item.title}</span>
    </>
  )

  const row = item.url ? (
    // Tiene página propia: la fila entera navega.
    <Button
      asChild
      isActive={isActive}
      data-state={hasChildren ? (open ? "open" : "closed") : undefined}
      tooltip={item.depth === 0 && !hasChildren ? item.title : undefined}
      className={rowClassName}
    >
      <Link href={item.url} aria-current={isActive ? "page" : undefined}>
        {label}
        <NavLinkSpinner />
      </Link>
    </Button>
  ) : (
    // Grupo puro: no hay a dónde navegar, la fila es el toggle.
    <Button
      asChild={item.depth > 0}
      isActive={false}
      data-state={open ? "open" : "closed"}
      onClick={item.depth === 0 ? () => onToggle(item.code) : undefined}
      className={cn(rowClassName, "cursor-pointer")}
    >
      {item.depth > 0 ? (
        // SidebarMenuSubButton renderiza un <a>: para un toggle hace falta un
        // <button> real (semántica + teclado), así que va por asChild.
        <button type="button" onClick={() => onToggle(item.code)}>
          {label}
        </button>
      ) : (
        label
      )}
    </Button>
  )

  const children = hasChildren ? (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="sub"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : spring.snappy}
          className="overflow-hidden"
        >
          <SidebarMenuSub
            id={subId}
            className={cn(item.depth > 0 && "border-border/60")}
          >
            {item.children.map((child) => (
              <NavItemNode
                key={child.id}
                item={child}
                activeTrail={activeTrail}
                openCodes={openCodes}
                onToggle={onToggle}
              />
            ))}
          </SidebarMenuSub>
        </motion.div>
      )}
    </AnimatePresence>
  ) : null

  // Rail colapsado: los subniveles están ocultos por CSS, así que un grupo sin
  // flyout sería un click muerto. El flyout envuelve la fila y saca los
  // descendientes a un popover.
  if (hasChildren && isCollapsedRail && item.depth === 0) {
    return (
      <Item>
        <NavFlyout item={item} activeTrail={activeTrail}>
          {row}
        </NavFlyout>
      </Item>
    )
  }

  return (
    <Item>
      {row}
      {hasChildren && item.url && (
        <NavChevron
          open={open}
          title={item.title}
          controls={subId}
          onToggle={() => onToggle(item.code)}
        />
      )}
      {hasChildren && !item.url && (
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200",
            "group-data-[collapsible=icon]:hidden",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      )}
      {children}
    </Item>
  )
}
