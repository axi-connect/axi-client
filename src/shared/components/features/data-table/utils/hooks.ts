import type { ColumnDef, DataRow } from "../types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Los campos que ofrece el selector de búsqueda.
 *
 * Descarta las columnas cuya etiqueta resuelve a cadena VACÍA. Antes, una
 * columna estructural —la casilla de selección, declarada con `accessorKey` y
 * `header: ""`— metía una entrada en blanco en el desplegable, y la única
 * defensa era que cada consumidor se acordara de poner `searchable: false`. Una
 * entrada sin nombre no se puede elegir a propósito.
 */
export function useSearchableFields<T extends DataRow>(columns: ColumnDef<T>[], preferred: Array<keyof T & string>) {
  return useMemo(() => {
    const itemsMap = new Map<string, { key: string; label: string }>(
      columns
        .filter((c) => !!c.accessorKey && c.searchable !== false)
        .filter((c) => (typeof c.header === "string" ? c.header.trim() !== "" : true))
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

export function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delayMs: number, enabled: boolean) {
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
    // `id === "actions"` sigue siendo `end` sin que nadie lo declare: era el
    // único anclaje que existía y lo usan varias tablas. Se conserva TAL CUAL
    // para que este cambio no mueva ninguna de las 17.
    const isEnd = (c: ColumnDef<T>) => c.pinned === "end" || c.id === "actions"
    const isStart = (c: ColumnDef<T>) => c.pinned === "start" && !isEnd(c)
    const start = columns.filter(isStart)
    const actions = columns.filter(isEnd)
    const rest = columns.filter((c) => !isStart(c) && !isEnd(c))
    const always = rest.filter((c) => c.alwaysVisible)
    const flexible = rest.filter((c) => !c.alwaysVisible)
    return { start, actions, always, flexible }
  }, [columns])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let rafId: number | null = null
    const compute = () => {
      const minWidth = opts.minColumnWidth
      const containerWidth = el.clientWidth || 0
      const consumedWidth = [
        ...categorized.start,
        ...categorized.always,
        ...categorized.actions,
      ].reduce((sum, c) => sum + (c.minWidth ?? minWidth), 0)
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
    const { start, actions, always, flexible } = categorized
    // Orden: start (ancladas) + always + flexible (centro) + actions (derecha)
    const ordered = [...always, ...flexible]
    const baseVisible = ordered.slice(0, visibleCount)
    const visibleSet = new Set([...start, ...baseVisible, ...actions])
    const visibleColumns = [...start, ...baseVisible, ...actions]
    // Ni las ancladas ni las de acciones se colapsan: una casilla dentro del
    // panel «Ver más» no sirve para nada.
    const collapsedColumns = columns.filter((c) => !visibleSet.has(c))
    return { visibleColumns, collapsedColumns }
  }, [columns, visibleCount, categorized])
}

export function useRowCollapse(initialOpen = false) {
  const [open, setOpen] = useState<boolean>(initialOpen)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
}