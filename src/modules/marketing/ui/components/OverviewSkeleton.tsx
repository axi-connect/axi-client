import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Silueta del resumen: replica la estructura real (encabezado, 5 tiles y dos
 * paneles) para que el render final no salte. Anchos DETERMINISTAS — un ancho
 * aleatorio rompe la hidratación (DESIGN-SYSTEM §9.1).
 */
export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando marketing">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {[0, 1].map((panel) => (
          <div key={panel} className="rounded-2xl border border-border">
            <div className="border-b border-border/60 px-5 py-3.5">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="space-y-4 p-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
