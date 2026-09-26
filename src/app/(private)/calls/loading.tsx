import { Skeleton } from "@/shared/components/ui/skeleton";

/** La silueta del bento del Monitoreo (premium F5): mismas celdas, sin datos. */
export default function CallsMonitorLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando el monitoreo">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-3xl lg:row-span-2" />
        <Skeleton className="h-36 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl lg:col-span-3" />
      </div>
    </div>
  );
}
