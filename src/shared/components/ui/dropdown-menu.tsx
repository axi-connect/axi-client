"use client"

import { cn } from "@/core/lib/utils"
import { useState, useRef, useEffect, useContext, cloneElement, createContext } from "react"

type DropdownContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: React.RefObject<HTMLDivElement>
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children, className }: { children: React.ReactNode, className?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) {
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
    <DropdownContext.Provider value={{ open, setOpen, rootRef }}>
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

export function DropdownMenuContent({ className, align = "end", children }: { className?: string; align?: "start" | "end"; children: React.ReactNode }) {
  const ctx = useContext(DropdownContext)
  const contentRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      role="menu"
      ref={contentRef}
      className={cn(
        "bg-background text-foreground border-border absolute z-50 mt-2 min-w-40 rounded-md border shadow-lg flex flex-col p-1",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
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