import { cn } from "@/core/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

type FormSkeletonProps = {
  /** Campos simulados. Default 6 (grid de 2 columnas en md+). */
  fields?: number
  /** Título + subtítulo de página encima del formulario. */
  showHeader?: boolean
  className?: string
}

/**
 * Skeleton estructural para vistas de formulario (`DynamicForm`): replica el
 * grid `{base:1, md:2}` con label + control por campo, y la fila de acciones.
 */
export function FormSkeleton({ fields = 6, showHeader = true, className }: FormSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Cargando formulario"
      aria-busy="true"
      className={cn("space-y-6 p-6", className)}
    >
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>

      <span className="sr-only">Cargando formulario…</span>
    </div>
  )
}
