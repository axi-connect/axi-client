import { FormSkeleton } from "@/shared/components/features/loading";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Esqueleto estructural de una pestaña de Mi empresa (una tarjeta + formulario). */
export function CompanySettingsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <FormSkeleton fields={6} showHeader={false} />
    </div>
  );
}
