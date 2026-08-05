import { cn } from "@/core/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** Anchos deterministas de las vistas previas de conversación (SSR-safe). */
const PREVIEW_WIDTHS = ["78%", "62%", "84%", "56%", "70%", "64%", "76%"]

/**
 * Skeleton estructural del inbox: panel izquierdo (lista de conversaciones)
 * + panel derecho (conversación con burbujas y compositor).
 */
export function InboxSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando conversaciones"
      aria-busy="true"
      className={cn("flex min-h-0 flex-1 overflow-hidden", className)}
    >
      {/* Lista de conversaciones */}
      <div className="flex w-full max-w-xs shrink-0 flex-col gap-1 border-r border-border p-3">
        <Skeleton className="mb-2 h-9 w-full" />
        {PREVIEW_WIDTHS.map((width, index) => (
          <div key={index} className="flex items-center gap-3 rounded-md p-2.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3" style={{ width }} />
            </div>
          </div>
        ))}
      </div>

      {/* Panel de conversación */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border p-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 p-4">
          <Skeleton className="h-12 w-52 max-w-[70%] rounded-2xl" />
          <Skeleton className="ml-auto h-9 w-44 max-w-[60%] rounded-2xl" />
          <Skeleton className="h-16 w-64 max-w-[75%] rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-56 max-w-[65%] rounded-2xl" />
        </div>
        <div className="border-t border-border p-3">
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>

      <span className="sr-only">Cargando conversaciones…</span>
    </div>
  )
}
