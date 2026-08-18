import { Skeleton } from "@/shared/components/ui/skeleton";

/** Skeleton estructural del listado (mismo criterio que el de canales). */
export default function IntegrationsSettingsLoading() {
  return (
    <div role="status" aria-label="Cargando integraciones" aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1].map((index) => (
          <div key={index} className="space-y-3.5 rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando integraciones…</span>
    </div>
  );
}
