import { Skeleton } from "@/shared/components/ui/skeleton";

/** Una tarjeta de bento en silueta: antetítulo, cifra y dos líneas. */
function TileSkeleton({ className, rows = 2 }: { className?: string; rows?: number }) {
  return (
    <div className={`border-border flex flex-col gap-3 rounded-3xl border p-5 ${className ?? ""}`}>
      <Skeleton className="h-3 w-32 rounded-md" />
      <Skeleton className="h-10 w-36 rounded-lg" />
      {Array.from({ length: rows }, (_, row) => (
        <Skeleton key={row} className={`h-3 rounded-md ${row % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
      ))}
    </div>
  );
}

/**
 * Silueta del Resumen: la misma rejilla que el bento real (lo recuperado y las
 * campañas a la izquierda, «Lo próximo» a la derecha, las seis tarjetas
 * debajo) para que el render final no salte. Anchos DETERMINISTAS — un ancho
 * aleatorio rompe la hidratación (DESIGN-SYSTEM §9.1).
 */
export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando marketing">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40 rounded-md" />
        <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
        <Skeleton className="mt-2 h-11 w-[36rem] max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TileSkeleton className="md:col-span-2" rows={4} />
        <TileSkeleton className="md:col-span-2 xl:col-span-1 xl:row-span-2" rows={5} />
        <TileSkeleton className="md:col-span-2" rows={3} />
        <TileSkeleton rows={4} />
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
        <TileSkeleton />
      </div>
    </div>
  );
}
