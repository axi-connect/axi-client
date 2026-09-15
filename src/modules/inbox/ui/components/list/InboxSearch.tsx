"use client"

import { SearchField } from "@/shared/components/ui/search-field"

/**
 * Búsqueda compacta del rail (288 px).
 *
 * Es un envoltorio de `SearchField` con el texto de este módulo: el
 * comportamiento —rebote, limpiar, Enter/Escape— se promovió al primitivo
 * cuando la bandeja de tareas necesitó el mismo campo, para no tener dos.
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
  return (
    <SearchField
      value={value}
      onChange={onChange}
      placeholder="Buscar por nombre o teléfono"
      label="Buscar conversaciones por nombre o teléfono"
      className={`rounded-md ${className ?? ""}`}
    />
  )
}
