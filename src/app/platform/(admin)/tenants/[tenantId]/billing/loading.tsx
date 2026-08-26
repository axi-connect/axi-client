import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta del tab Facturación (tiles + dos cards de formulario). */
export default function TenantBillingLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando facturación" aria-busy="true">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
