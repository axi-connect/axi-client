import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Esqueleto del pipeline con la misma forma que la vista (lienzo CRM premium
 * F1, estados): cabecera, bento de tres fichas + la isla, y columnas. Del mismo
 * alto que el contenido, para que nada salte al llegar los datos.
 */
export default function CrmPipelineLoading() {
  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 md:gap-5 md:p-6"
      role="status"
      aria-label="Cargando el pipeline"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56 rounded-full" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
        <Skeleton className="h-10 w-72 max-w-full rounded-full" />
      </div>
      <Skeleton className="h-7 w-72 max-w-full rounded-full" />
      <div className="@container shrink-0">
        <div className="flex gap-3 overflow-hidden @min-[66rem]:grid @min-[66rem]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)] @min-[66rem]:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-[140px] w-[15.5rem] shrink-0 rounded-3xl @min-[66rem]:w-auto"
            />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-full w-[17rem] shrink-0 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
