import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Silueta de la bandeja (lienzo CRM premium F3, estados): cabecera, el bento
 * del marcador con la isla, la barra de trabajo y la lista por días. Del
 * mismo alto que el contenido, para que nada salte al llegar los datos.
 */
export default function CrmTasksLoading() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[70rem] space-y-4" role="status" aria-label="Cargando tareas">
      <div className="space-y-2">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-4 w-80 max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,19rem)]">
        <Skeleton className="h-[116px] rounded-3xl" />
        <Skeleton className="h-[116px] rounded-3xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}
