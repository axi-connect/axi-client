import type { ColumnDef, DataRow } from "../types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSearchableFields<T extends DataRow>(columns: ColumnDef<T>[], preferred: Array<keyof T & string>) {
  return useMemo(() => {
    const itemsMap = new Map<string, { key: string; label: string }>(
      columns
        .filter((c) => !!c.accessorKey)
        .map((c) => [
          String(c.accessorKey),
          { key: String(c.accessorKey), label: typeof c.header === "string" ? c.header : String(c.accessorKey) },
        ])
    )

    const ordered: { key: string; label: string }[] = []
    const added = new Set<string>()
    // Primero, respetar el orden preferido
    for (const k of preferred) {
      const it = itemsMap.get(String(k))
      if (it && !added.has(it.key)) {
        ordered.push(it)
        added.add(it.key)
      }
    }
    // Luego, agregar el resto manteniendo el orden de inserción
    for (const [, it] of itemsMap) {
      if (!added.has(it.key)) {
        ordered.push(it)
        added.add(it.key)
      }
    }
    return ordered
  }, [columns, preferred])
}

export function useDebouncedCallback<T extends any[]>(fn: (...args: T) => void, delayMs: number, enabled: boolean) {
  const ref = useRef<number | null>(null)
  const callback = useCallback((...args: T) => {
    if (!enabled) {
      fn(...args)
      return
    }
    if (ref.current) window.clearTimeout(ref.current)
    ref.current = window.setTimeout(() => fn(...args), delayMs)
  }, [delayMs, enabled, fn])

  useEffect(() => () => { if (ref.current) window.clearTimeout(ref.current) }, [])
  return callback
}

export function useControlled<T>(controlled: T | undefined, fallback: T) {
  const [state, setState] = useState<T>(controlled ?? fallback)
  useEffect(() => { if (controlled !== undefined) setState(controlled) }, [controlled])
  return [state, setState] as const
}

export function useMediaQuery(query: string) {
  // Avoid SSR/client mismatch: render "false" until mounted, then update
  const [matches, setMatches] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])
  return matches
}

export function useResponsiveColumns<T extends DataRow>(
  columns: ColumnDef<T>[],
  containerRef: React.RefObject<HTMLDivElement | null>,
  opts: { minColumnWidth: number }
) {
  const [visibleCount, setVisibleCount] = useState<number>(columns.length)
  // Pre-categorizar columnas (evita recomputar por resize)
  const categorized = useMemo(() => {
    const actions = columns.filter((c) => c.id === "actions")
    const always = columns.filter((c) => c.alwaysVisible && c.id !== "actions")
    const flexible = columns.filter((c) => !c.alwaysVisible && c.id !== "actions")
    return { actions, always, flexible }
  }, [columns])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let rafId: number | null = null
    const compute = () => {
      const minWidth = opts.minColumnWidth
      const containerWidth = el.clientWidth || 0
      const consumedWidth = [...categorized.always, ...categorized.actions].reduce(
        (sum, c) => sum + (c.minWidth ?? minWidth),
        0
      )
      const availableForFlexible = Math.max(0, containerWidth - consumedWidth)
      const widths = categorized.flexible.map((c) => c.minWidth ?? minWidth)
      let acc = 0
      let flexCount = 0
      for (const w of widths) {
        if (acc + w <= availableForFlexible) {
          acc += w
          flexCount += 1
        } else {
          break
        }
      }
      const baseVisible = Math.max(0, categorized.always.length + flexCount)
      const ensured = Math.max(1, baseVisible)
      setVisibleCount(Math.min(ensured, columns.length))
    }

    const throttled = () => {
      if (rafId != null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        compute()
      })
    }

    const observer = new ResizeObserver(throttled)
    observer.observe(el)
    // Primer cálculo inmediato
    compute()
    return () => observer.disconnect()
  }, [columns, containerRef, opts.minColumnWidth, categorized])

  return useMemo(() => {
    const { actions, always, flexible } = categorized
    // Orden: always (izquierda) + flexible (centro) + actions (derecha)
    const ordered = [...always, ...flexible]
    const baseVisible = ordered.slice(0, visibleCount)
    const visibleSet = new Set([...baseVisible, ...actions])
    // Asegurar actions siempre visibles al final (derecha)
    const visibleColumns = [...baseVisible, ...actions]
    const collapsedColumns = columns.filter((c) => !visibleSet.has(c) && c.id !== "actions")
    return { visibleColumns, collapsedColumns }
  }, [columns, visibleCount, categorized])
}

export function useRowCollapse(initialOpen = false) {
  const [open, setOpen] = useState<boolean>(initialOpen)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
}