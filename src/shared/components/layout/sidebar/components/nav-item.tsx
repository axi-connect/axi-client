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
 * Geometría ÚNICA del chevron, compartida por la variante interactiva y la
 * decorativa. Cuando cada una escribía la suya (`right-1` con caja `size-5`
 * frente a `right-2` con svg `size-4`) las flechas de filas hermanas no
 * alineaban entre sí.
 *
 * Se posiciona contra LA FILA, nunca contra el `<li>`: ver el wrapper en
 * `NavItemNode`.
 */
const CHEVRON_BOX =
  "absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-sm"
const CHEVRON_ICON = "size-4 transition-transform duration-200"
/**
 * Compensa el `translate-x-px` que `SidebarMenuSub` aplica al `<ul>` para
 * cuadrar su línea guía. Las filas ya lo devuelven con su propio
 * `-translate-x-px`, pero el chevron cuelga del wrapper, no de la fila: sin
 * esto las flechas de los subniveles caen 1px a la derecha de las de nivel 0 y
 * la columna de flechas deja de ser una sola.
 */
const CHEVRON_NESTED_NUDGE = "-translate-x-px"
/** Hueco reservado en la fila para que el label no pase por debajo de la flecha. */
const CHEVRON_GUTTER = "pr-8"

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
  nested,
  onToggle,
}: {
  open: boolean
  title: string
  controls: string
  nested: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      data-testid="nav-chevron"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? "Contraer" : "Expandir"} ${title}`}
      onClick={onToggle}
      className={cn(
        CHEVRON_BOX,
        nested && CHEVRON_NESTED_NUDGE,
        "z-10 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        // Agranda el área táctil en móvil sin mover el layout.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
      )}
    >
      <ChevronDown aria-hidden="true" className={cn(CHEVRON_ICON, open ? "rotate-180" : "rotate-0")} />
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
    hasChildren && CHEVRON_GUTTER,
  )

  // Contenido común de la fila (el icono solo existe en el nivel 0).
  // El `truncate` va en el span y no se delega al `[&>span:last-child]` de los
  // primitivos: con el spinner de navegación pendiente el título deja de ser el
  // último hijo y perdería el truncado justo cuando más se nota.
  const label = (
    <>
      {item.icon ? <item.icon /> : null}
      <span className="truncate">{item.title}</span>
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
    // Grupo puro: no hay a dónde navegar, la fila es el toggle. Como no hay
    // chevron interactivo que lo declare, el estado de plegado lo anuncia la
    // propia fila; la flecha de al lado es decorativa (`aria-hidden`).
    <Button
      asChild={item.depth > 0}
      isActive={false}
      data-state={open ? "open" : "closed"}
      aria-expanded={item.depth === 0 ? open : undefined}
      aria-controls={item.depth === 0 ? subId : undefined}
      onClick={item.depth === 0 ? () => onToggle(item.code) : undefined}
      className={cn(rowClassName, "cursor-pointer")}
    >
      {item.depth > 0 ? (
        // SidebarMenuSubButton renderiza un <a>: para un toggle hace falta un
        // <button> real (semántica + teclado), así que va por asChild.
        // El `w-full` es obligatorio: un <button> no se estira con `display:flex`
        // como sí lo hace un <a>, así que sin él la fila se encogía al ancho del
        // texto y su fondo de hover salía como una píldora corta entre hermanas
        // a ancho completo.
        <button
          type="button"
          className="w-full"
          aria-expanded={open}
          aria-controls={subId}
          onClick={() => onToggle(item.code)}
        >
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
          {/* `mr-0 pr-0` anula el sangrado DERECHO del primitivo (`mx-3.5
              px-2.5`): la jerarquía se lee por la izquierda, y con el submenú
              también estrechado por la derecha las filas hijas quedaban 24px
              más cortas que las de nivel 0 — sus fondos de hover y sus chevrons
              no alineaban con el resto del menú. La sangría izquierda no se
              toca: son los 24px que dejan el label del hijo justo bajo el del
              padre. */}
          <SidebarMenuSub
            id={subId}
            className={cn("mr-0 pr-0", item.depth > 0 && "border-border/60")}
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
      {/* La fila y su chevron viven en una caja posicionada PROPIA, que NO
          contiene el submenú. Sin ella el chevron se posiciona contra el <li>
          —los primitivos `SidebarMenuItem`/`SidebarMenuSubItem` llevan
          `relative`—, y ese <li> también envuelve los hijos: `top-1/2` medía
          entonces la mitad de (fila + submenú), así que al desplegar la flecha
          se salía de su fila hacia abajo, en proporción al número de hijos.
          Caía sobre la fila de un hijo (aparentando una flecha en una hoja) o
          junto a la flecha de un subgrupo (aparentando dos), y además viajaba
          mientras se animaba la altura. */}
      <div className="relative">
        {row}
        {hasChildren &&
          (item.url ? (
            <NavChevron
              open={open}
              title={item.title}
              controls={subId}
              nested={item.depth > 0}
              onToggle={() => onToggle(item.code)}
            />
          ) : (
            // Grupo puro: la fila entera ya es el toggle, así que la flecha es
            // decorativa y deja pasar el click hasta el botón de debajo.
            <span
              data-testid="nav-chevron"
              aria-hidden="true"
              className={cn(
                CHEVRON_BOX,
                item.depth > 0 && CHEVRON_NESTED_NUDGE,
                "pointer-events-none text-muted-foreground",
                "group-data-[collapsible=icon]:hidden",
              )}
            >
              <ChevronDown className={cn(CHEVRON_ICON, open ? "rotate-180" : "rotate-0")} />
            </span>
          ))}
      </div>
      {children}
    </Item>
  )
}
