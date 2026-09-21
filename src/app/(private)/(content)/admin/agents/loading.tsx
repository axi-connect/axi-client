import { Skeleton } from "@/shared/components/ui/skeleton";

/** Esqueleto estructural de la rejilla de agentes (docs/design/LOADING.md). */
export default function AgentsLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando agentes">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="grid grid-cols-[104px_1fr] items-center gap-3.5 rounded-[20px] border border-border p-3.5">
            <Skeleton className="size-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-6 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
