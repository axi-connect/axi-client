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
    <div className="flex items-start gap-3 rounded-2xl px-3 py-2.5">
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
 * Skeleton estructural del inbox (premium F1): la lista (título de la vista y
 * su frase, búsqueda, segmentado por debajo de `lg` y filas) y, en md+, la
 * silueta de «Tu día», que es lo que pinta el panel sin conversación abierta.
 * Mide lo mismo que la vista real (`md:w-80`, título `text-2xl`, búsqueda
 * `h-10`). La columna de vistas y canales vive en el layout del workspace y no
 * se repite aquí.
 */
export function InboxSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando conversaciones"
      aria-busy="true"
      className={cn("flex min-h-0 flex-1 overflow-hidden", className)}
    >
      {/* Lista */}
      <div className="flex w-full shrink-0 flex-col border-r border-border md:w-80">
        <div className="space-y-3 border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 pt-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full lg:hidden" />
        </div>
        <div className="space-y-0.5 p-2">
          {PREVIEW_WIDTHS.map((width, index) => (
            <ConversationRowSkeleton key={index} previewWidth={width} />
          ))}
        </div>
      </div>

      {/* Tu día */}
      <div className="hidden min-w-0 flex-1 md:block">
        <div className="mx-auto w-full max-w-[40rem] space-y-4 px-6 py-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-44 rounded-3xl" />
          </div>
        </div>
      </div>

      <span className="sr-only">Cargando conversaciones…</span>
    </div>
  )
}
