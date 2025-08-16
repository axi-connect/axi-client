"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type DropdownContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: React.RefObject<HTMLDivElement>
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null as unknown as HTMLDivElement)

  React.useEffect(() => {
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
      <div ref={rootRef} className="relative inline-flex">{children}</div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) return children
  const triggerProps = {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      ctx.setOpen(!ctx.open)
    },
    "aria-haspopup": "menu" as const,
    "aria-expanded": ctx.open,
  }
  return asChild ? React.cloneElement(children, triggerProps) : <button {...triggerProps}>{children}</button>
}

export function DropdownMenuContent({ className, align = "end", children }: { className?: string; align?: "start" | "end"; children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  if (!ctx) return null
  if (!ctx.open) return null
  return (
    <div
      role="menu"
      className={cn(
        "bg-background text-foreground border-border absolute z-50 mt-2 min-w-40 rounded-md border shadow-lg flex flex-col p-1",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ className, onClick, children }: { className?: string; onClick?: () => void; children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)
  return (
    <button
      role="menuitem"
      className={cn("hover:bg-accent hover:text-accent-foreground block w-full rounded-sm px-3 py-2 text-left text-sm", className)}
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


