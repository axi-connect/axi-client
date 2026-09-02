import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CallsMonitorLoading() {
  return (
    <div className="space-y-5 p-4 md:p-6" role="status" aria-label="Cargando el monitoreo">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
