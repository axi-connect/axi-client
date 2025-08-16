import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnDef, DataRow } from "./types"

export function useSearchableFields<T extends DataRow>(columns: ColumnDef<T>[], preferred: Array<keyof T & string>) {
  return useMemo(() => {
    const items = columns
      .filter((c) => !!c.accessorKey)
      .map((c) => ({ key: String(c.accessorKey), label: typeof c.header === "string" ? c.header : String(c.accessorKey) }))

    const ordered: { key: string; label: string }[] = []
    for (const k of preferred) {
      const f = items.find((i) => i.key === k)
      if (f) ordered.push(f)
    }
    for (const it of items) {
      if (!ordered.some((o) => o.key === it.key)) ordered.push(it)
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