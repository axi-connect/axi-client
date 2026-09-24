import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton estructural de `/comercial`: cabecera, hero con la línea, la línea
 * del ritmo y dos listas. RSC-compatible: sirve en `loading.tsx` y como
 * fallback de la vista mientras carga la meta.
 */
export function CommercialSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div role="status" aria-label="Cargando la ruta del mes" className="space-y-5">
      {withHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      ) : null}
      <div className="space-y-4 rounded-2xl border border-border p-6">
        <Skeleton className="h-11 w-64 rounded-lg" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
      <Skeleton className="h-9 w-80 max-w-full rounded-md" />
      <div className="space-y-px overflow-hidden rounded-2xl border border-border">
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton key={row} className="h-16 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
