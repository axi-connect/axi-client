import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta con la forma de la ficha: cabecera, dos columnas y la isla (DS §9.1). */
export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando el producto" className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 shrink-0 rounded-[22px] sm:size-28" />
        <div className="flex flex-1 flex-col gap-2.5">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-9 w-full max-w-md rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
