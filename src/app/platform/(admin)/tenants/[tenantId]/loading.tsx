import { Skeleton } from "@/shared/components/ui/skeleton";

/** Silueta del detalle del tenant: header + tabs + contenido (misma forma
    que pinta el layout, para que el render final no salte). */
export default function TenantDetailLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando tenant" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
