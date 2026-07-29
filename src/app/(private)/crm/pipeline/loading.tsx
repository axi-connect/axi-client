import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural del pipeline: header + KPIs + columnas. */
export default function CrmPipelineLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6" role="status" aria-label="Cargando pipeline">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-44 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-full w-72 shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
