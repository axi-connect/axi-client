"use client"

import { cn } from "@/core/lib/utils"
import { useState, useRef, useEffect, useLayoutEffect, useContext, cloneElement, createContext } from "react"
import { createPortal } from "react-dom"

type DropdownContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: React.RefObject<HTMLDivElement>
  /** El panel abierto. Con `portal` vive fuera de `rootRef`: el clic fuera tiene que mirar los dos. */
  contentRef: React.MutableRefObject<HTMLDivElement | null>
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children, className }: { children: React.ReactNode, className?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      const target = e.target as Node
      if (root && !root.contains(target) && !contentRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen, rootRef, contentRef }}>
      <div ref={rootRef} className={cn("relative inline-flex", className)}>{children}</div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = useContext(DropdownContext)
  if (!ctx) return children
  const triggerProps = {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      ctx.setOpen(!ctx.open)
    },
    "aria-haspopup": "menu" as const,
    "aria-expanded": ctx.open,
  }
  return asChild ? cloneElement(children, triggerProps) : <button {...triggerProps}>{children}</button>
}

/**
 * `portal`: el panel se pinta en `document.body` con posición fija junto al
 * disparador. Lo necesita un menú que vive dentro de un scroller o de una
 * tarjeta con `overflow-hidden` (una fila de `Table`, que trae su propio
 * `overflow-x-auto`): en su sitio quedaría recortado. Al hacer scroll o
 * redimensionar SIGUE a su disparador, y solo se cierra si el disparador deja de
 * verse (fuera de la ventana o recortado por su scroller). Cerrarse con
 * cualquier scroll era una carrera: pulsar el «…» de otra fila con un menú
 * abierto le da el foco a ese botón, el navegador desplaza su contenedor unos
 * píxeles y ese scroll llegaba DESPUÉS de abrir el menú nuevo, que se cerraba
 * solo (auditoría fase 2, P2). Opcional: los demás usos no cambian.
 */
/**
 * ¿Se ve el elemento? Dentro de la ventana y sin quedar recortado por ninguno de
 * los contenedores con scroll o recorte que lo envuelven (la tabla que scrollea
 * de lado, el panel de la app).
 */
function isVisibleInScrollers(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) return false
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (style.overflowX === "visible" && style.overflowY === "visible") continue
    const box = parent.getBoundingClientRect()
    if (rect.bottom <= box.top || rect.top >= box.bottom || rect.right <= box.left || rect.left >= box.right) return false
  }
  return true
}

export function DropdownMenuContent({
  className,
  align = "end",
  side = "bottom",
  portal = false,
  children,
}: {
  className?: string
  align?: "start" | "end"
  side?: "top" | "bottom"
  portal?: boolean
  children: React.ReactNode
}) {
  const ctx = useContext(DropdownContext)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fixed, setFixed] = useState<React.CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!portal || !ctx?.open) return
    const place = () => {
      const rect = ctx.rootRef.current?.getBoundingClientRect()
      if (!rect) return
      setFixed({
        position: "fixed",
        ...(side === "top" ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
        ...(align === "end" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
      })
    }
    place()
    const follow = (event: Event) => {
      // Un scroll dentro del propio panel no mueve el disparador.
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return
      const trigger = ctx.rootRef.current
      if (!trigger || !isVisibleInScrollers(trigger)) {
        ctx.setOpen(false)
        return
      }
      place()
    }
    window.addEventListener("scroll", follow, true)
    window.addEventListener("resize", follow)
    return () => {
      window.removeEventListener("scroll", follow, true)
      window.removeEventListener("resize", follow)
    }
  }, [portal, ctx, side, align])

  // Focus first menu item when opening for keyboard navigation
  useEffect(() => {
    if (!ctx?.open) return
    const root = contentRef.current
    if (!root) return
    const items = root.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLButtonElement>
    if (items.length > 0) {
      requestAnimationFrame(() => {
        items[0]?.focus()
      })
    }
  }, [ctx?.open])

  if (!ctx) return null
  if (!ctx.open) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const root = contentRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll('[role="menuitem"]')) as HTMLButtonElement[]
    if (items.length === 0) return

    const currentIndex = items.findIndex((el) => el === document.activeElement)
    const focusItemAt = (index: number) => {
      const nextIndex = (index + items.length) % items.length
      items[nextIndex]?.focus()
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (currentIndex === -1) focusItemAt(0)
        else focusItemAt(currentIndex + 1)
        break
      case "ArrowUp":
        e.preventDefault()
        if (currentIndex === -1) focusItemAt(items.length - 1)
        else focusItemAt(currentIndex - 1)
        break
      case "Home":
        e.preventDefault()
        focusItemAt(0)
        break
      case "End":
        e.preventDefault()
        focusItemAt(items.length - 1)
        break
      case "Enter":
      case " ":
        if (currentIndex >= 0) {
          e.preventDefault()
          items[currentIndex]?.click()
        }
        break
      case "Escape":
        e.preventDefault()
        ctx.setOpen(false)
        break
      default:
        break
    }
  }

  const panel = (
    <div
      role="menu"
      ref={(node) => {
        contentRef.current = node
        ctx.contentRef.current = node
      }}
      style={portal ? (fixed ?? { position: "fixed", visibility: "hidden" }) : undefined}
      className={cn(
        "glass bg-background text-foreground border-border z-50 min-w-40 rounded-lg border flex flex-col p-1",
        !portal && "absolute",
        // `top` para triggers pegados al borde inferior (footer del sidebar)
        !portal && (side === "top" ? "bottom-full mb-2" : "mt-2"),
        !portal && (align === "end" ? "right-0" : "left-0"),
        className
      )}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )

  return portal ? createPortal(panel, document.body) : panel
}

export function DropdownMenuItem({ className, onClick, children }: { className?: string; onClick?: () => void; children: React.ReactNode }) {
  const ctx = useContext(DropdownContext)
  return (
    <button
      role="menuitem"
      className={cn("hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block w-full rounded-sm px-3 py-2 text-left text-sm outline-none", className)}
      onClick={() => {
        onClick?.()
        ctx?.setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-muted-foreground px-3 py-2 text-xs font-medium", className)}>{children}</div>
}

export function DropdownMenuSeparator() {
  return <div className="bg-border my-1 h-px w-full" />
}