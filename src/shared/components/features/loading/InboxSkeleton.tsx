import { cn } from "@/core/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** Anchos deterministas de las vistas previas de conversación (SSR-safe). */
const PREVIEW_WIDTHS = ["78%", "62%", "84%", "56%", "70%", "64%", "76%", "58%"]

/**
 * Silueta de UNA fila de la lista (avatar 40 + nombre + preview). La comparten
 * el skeleton de ruta y la lista real (primera carga y «cargando más»), así la
 * forma no se desvía de la fila verdadera.
 */
export function ConversationRowSkeleton({ previewWidth = "70%" }: { previewWidth?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-9" />
        </div>
        <Skeleton className="h-3" style={{ width: previewWidth }} />
      </div>
    </div>
  )
}

/**
 * Skeleton estructural del inbox: rail (cabecera de cuatro filas + lista de
 * conversaciones) + panel de conversación con burbujas y compositor. Mide lo
 * mismo que la vista real (`md:w-72`, controles `h-9`, segmentado `h-7`).
 */
export function InboxSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando conversaciones"
      aria-busy="true"
      className={cn("flex min-h-0 flex-1 overflow-hidden", className)}
    >
      {/* Rail */}
      <div className="flex w-full shrink-0 flex-col border-r border-border md:w-72">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex h-9 items-center justify-between">
            <Skeleton className="h-4 w-14" />
            <div className="flex gap-1">
              <Skeleton className="size-9 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-7 w-full rounded-full" />
        </div>
        <div className="space-y-0.5 p-2">
          {PREVIEW_WIDTHS.map((width, index) => (
            <ConversationRowSkeleton key={index} previewWidth={width} />
          ))}
        </div>
      </div>

      {/* Panel de conversación */}
      <div className="hidden min-w-0 flex-1 flex-col md:flex">
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
