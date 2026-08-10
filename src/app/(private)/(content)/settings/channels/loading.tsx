import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton estructural del listado de canales: cabecera + grid de tarjetas.
 * No usa `TableSkeleton` porque la vista es un grid de tarjetas, no una tabla:
 * un skeleton con forma de tabla produce el salto que el skeleton venía a
 * evitar (DESIGN-SYSTEM §9.1). Sin padding propio: lo aporta el layout.
 */
export default function ChannelsSettingsLoading() {
  return (
    <div role="status" aria-label="Cargando canales" aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-3.5 rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-6">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando canales…</span>
    </div>
  );
}
