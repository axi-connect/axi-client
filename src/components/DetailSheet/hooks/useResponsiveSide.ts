"use client"

import * as React from "react"
export type SheetAutoSide = "left" | "right" | "bottom"

export function useResponsiveSide(options?: { side?: "auto" | "left" | "right" | "bottom"; breakpoint?: number }) {
  const { side = "auto", breakpoint = 1024 } = options ?? {}
  const [resolved, setResolved] = React.useState<SheetAutoSide>("bottom")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!mounted) return
    if (side !== "auto") {
      setResolved(side)
      return
    }
    const update = () => {
      const width = window.innerWidth
      setResolved(width >= breakpoint ? "right" : "bottom")
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [mounted, side, breakpoint])

  return { side: resolved, mounted }
}