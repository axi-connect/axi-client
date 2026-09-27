import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * La silueta de una sección del catálogo con pestañas (catálogo premium F4):
 * antetítulo, titular, pestañas y la tarjeta de la lista, con anchos fijos
 * (DS §9.1: nunca `Math.random()`). `tiles` añade la fila del bento (Categorías).
 */
export function CatalogSectionSkeleton({ label, tiles = false }: { label: string; tiles?: boolean }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40 rounded" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="mt-3 h-9 w-full max-w-sm rounded-full" />
      </div>
      {tiles ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl md:col-span-2 xl:col-span-1" />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
        <Skeleton className="h-9 w-full max-w-xs rounded-full" />
        {["58%", "44%", "66%", "50%"].map((width) => (
          <div key={width} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 rounded-md" style={{ width }} />
            <Skeleton className="h-2.5 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
