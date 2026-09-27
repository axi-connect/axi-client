import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Silueta estructural de `/comercial`: cabecera, el instrumento de la ruta
 * (cifra, frase, línea y franja de cifras) y el bento (dos fichas, «Lo que
 * hace falta» y la isla). RSC-compatible: sirve en `loading.tsx` y como
 * respaldo de la vista mientras carga la meta. Mismas rejillas que la vista:
 * al llegar los datos nada salta de sitio.
 */
export function CommercialSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div role="status" aria-label="Cargando la ruta del mes" className="@container space-y-5">
      {withHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-40 rounded-md" />
            <Skeleton className="h-9 w-64 rounded-lg @xl:h-11 @xl:w-80" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="space-y-4 px-5 pt-5 pb-6 @xl:px-8 @xl:pt-7">
          <Skeleton className="h-3 w-32 rounded-md" />
          <Skeleton className="h-12 w-64 max-w-full rounded-lg @xl:h-16" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-border @4xl:grid-cols-4">
          {[0, 1, 2, 3].map((cell) => (
            <div key={cell} className="space-y-2 px-5 py-4 @xl:px-8">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem]">
        <Skeleton className="h-72 rounded-3xl @2xl:col-span-2 @4xl:col-span-1 @4xl:col-start-3 @4xl:row-span-2 @4xl:row-start-1 @4xl:h-auto" />
        <Skeleton className="h-52 rounded-3xl @4xl:col-start-1 @4xl:row-start-1" />
        <Skeleton className="h-52 rounded-3xl @4xl:col-start-2 @4xl:row-start-1" />
        <Skeleton className="h-96 rounded-3xl @2xl:col-span-2 @4xl:col-start-1 @4xl:col-end-3 @4xl:row-start-2" />
      </div>
    </div>
  );
}
