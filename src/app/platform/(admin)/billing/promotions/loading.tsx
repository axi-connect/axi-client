import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta de la línea de tiempo de vigencias. */
export default function PlatformBillingPricesLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando tarifas" aria-busy="true">
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}
