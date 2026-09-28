import { Skeleton } from "@/shared/components/ui/skeleton";

/** La silueta del listado premium: encabezado, pestañas, bento con la isla y la lista (formas reales). */
export default function ProductsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando el catálogo">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-44 rounded" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="mt-3 h-9 w-full max-w-sm rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl md:col-span-2 xl:col-span-1 xl:row-span-2" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
        <Skeleton className="h-9 w-full max-w-lg rounded-full" />
        {[62, 48, 70, 55, 66].map((width) => (
          <div key={width} className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 rounded-md" style={{ width: `${width}%` }} />
              <Skeleton className="h-2.5 w-1/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
