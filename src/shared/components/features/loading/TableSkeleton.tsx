import { cn } from "@/core/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** Anchos deterministas por columna (SSR-safe: nunca aleatorios). */
const COLUMN_WIDTHS = ["28%", "20%", "24%", "14%"]

type TableSkeletonProps = {
  /** Filas simuladas. Default 8. */
  rows?: number
  /** Título + subtítulo de página encima de la tabla. */
  showHeader?: boolean
  className?: string
}

/**
 * Skeleton estructural para vistas de listado (`DataTable` + toolbar).
 * Usar como `loading.tsx` de rutas cuyo contenido principal es una tabla.
 */
export function TableSkeleton({ rows = 8, showHeader = true, className }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Cargando listado"
      aria-busy="true"
      // Sin padding propio: lo aporta el layout (content), igual que a la
      // página real — así el skeleton coincide 1:1 y no hay salto al montar.
      className={cn("space-y-6", className)}
    >
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      )}

      {/* Toolbar: búsqueda + acción primaria */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 max-w-[60%]" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Tabla: header + filas */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
          {COLUMN_WIDTHS.map((width, index) => (
            <Skeleton key={index} className="h-3.5" style={{ width }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b border-border-soft px-4 py-3.5 last:border-b-0"
          >
            {COLUMN_WIDTHS.map((width, colIndex) => (
              <Skeleton key={colIndex} className="h-4" style={{ width }} />
            ))}
            <Skeleton className="ml-auto size-6 shrink-0 rounded-md" />
          </div>
        ))}
      </div>

      <span className="sr-only">Cargando listado…</span>
    </div>
  )
}
