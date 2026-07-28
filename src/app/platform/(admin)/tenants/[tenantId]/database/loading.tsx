import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta del tab Base de datos (card de estado + sección de migración). */
export default function TenantDatabaseLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando base de datos" aria-busy="true">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
