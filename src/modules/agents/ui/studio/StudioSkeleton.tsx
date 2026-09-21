import { Skeleton } from "@/shared/components/ui/skeleton";

/** Esqueleto estructural del estudio: escenario a la izquierda, ficha y reglas a la derecha. */
export function StudioSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando el agente">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,372px)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[340px] rounded-3xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-[108px] rounded-2xl" />
            <Skeleton className="h-[108px] rounded-2xl" />
            <Skeleton className="h-[108px] rounded-2xl" />
          </div>
          <Skeleton className="h-9 rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[300px] rounded-2xl" />
          <Skeleton className="h-[220px] rounded-2xl" />
          <Skeleton className="h-[220px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
