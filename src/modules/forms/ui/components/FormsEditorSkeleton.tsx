import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton estructural del editor. Anchos DETERMINISTAS y alturas idénticas a
 * las reales (`h-9` controles, `h-4` texto) para que el render final no salte.
 */
export function FormsEditorSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando los formularios de captura">
      <Skeleton className="h-10 w-full max-w-[22rem] rounded-full" />
      <Skeleton className="h-4 w-72" />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-1 rounded-2xl border border-border p-2">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-11 w-full rounded-xl" />
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-border p-4 md:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
