"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/core/lib/utils"

const DEBOUNCE_MS = 300

/**
 * Búsqueda compacta del rail (288 px): campo a todo el ancho con icono y
 * botón de limpiar. El rebote vive aquí: el store recibe la búsqueda ya
 * APLICADA y reinicia la paginación una sola vez por pausa de tecleo.
 *
 * No es `TableSearch`: aquel es un combobox con sugerencias y 240 px mínimos,
 * pensado para tablas. Aquí no hay nada que sugerir.
 */
export function InboxSearch({
  value,
  onChange,
  className,
}: {
  /** Búsqueda aplicada (del store). */
  value: string
  onChange: (q: string) => void
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si el store la vacía desde fuera («Limpiar filtros»), el campo lo refleja.
  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  const commit = (next: string, immediate = false) => {
    setLocal(next)
    if (timer.current !== null) clearTimeout(timer.current)
    if (immediate) {
      onChange(next)
      return
    }
    timer.current = setTimeout(() => onChange(next), DEBOUNCE_MS)
  }

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-muted-foreground",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      <input
        type="search"
        value={local}
        onChange={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(local, true)
          if (event.key === "Escape" && local !== "") commit("", true)
        }}
        placeholder="Buscar por nombre o teléfono"
        aria-label="Buscar conversaciones por nombre o teléfono"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {local !== "" && (
        <button
          type="button"
          onClick={() => commit("", true)}
          aria-label="Borrar búsqueda"
          className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
