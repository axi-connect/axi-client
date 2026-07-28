import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta del tab Plan & Límites (card de plan + tabla de límites). */
export default function TenantPlanLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando plan" aria-busy="true">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
