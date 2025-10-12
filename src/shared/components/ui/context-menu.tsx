"use client"

import { cn } from "@/core/lib/utils"
import { createPortal } from "react-dom"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type ContextMenuPosition = { x: number; y: number }

type ContextMenuProps = {
  open: boolean
  position: ContextMenuPosition | null
  onOpenChange: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

export function ContextMenu({ open, position, onOpenChange, className, children }: ContextMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const root = contentRef.current
      if (root && !root.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
    }
  }, [open, onOpenChange])

  // Focus first item when opening
  useEffect(() => {
    if (!open) return
    const items = contentRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') as NodeListOf<HTMLElement> | undefined
    if (items && items.length > 0) {
      items[0].focus()
      setFocusedIndex(0)
    }
  }, [open])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    const els = Array.from(contentRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? []) as HTMLElement[]
    if (els.length === 0) return

    let nextIndex: number | null = null

    switch (e.key) {
      case "Escape":
        onOpenChange(false)
        return
      case "ArrowDown":
        e.preventDefault()
        nextIndex = Math.min(focusedIndex + 1, els.length - 1)
        break
      case "ArrowUp":
        e.preventDefault()
        nextIndex = Math.max(focusedIndex - 1, 0)
        break
      case "Home":
        e.preventDefault()
        nextIndex = 0
        break
      case "End":
        e.preventDefault()
        nextIndex = els.length - 1
        break
      default:
        return
    }

    if (nextIndex !== null && nextIndex !== focusedIndex) {
      els[nextIndex]?.focus()
      setFocusedIndex(nextIndex)
    }
  }, [open, onOpenChange, focusedIndex])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Prevent overflow: use actual size when available and clamp within viewport
  const style = useMemo(() => {
    if (!position || !open) return { position: "fixed" as const }
    const padding = 8
    const { innerWidth: vw, innerHeight: vh } = window
    const rect = contentRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 240
    const height = rect?.height ?? 240
    return {
      position: "fixed" as const,
      left: Math.max(padding, Math.min(position.x, vw - width - padding)),
      top: Math.max(padding, Math.min(position.y, vh - height - padding)),
    }
  }, [position, open])

  if (!open) return null
  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "z-50 min-w-40 rounded-md border border-border bg-background p-1 shadow-lg",
        "flex flex-col outline-none",
        className
      )}
      style={style}
    >
      {children}
    </div>,
    document.body
  )
}