import { Skeleton } from "@/shared/components/ui/skeleton";
import { KpiRowSkeleton } from "./AnalyticsSkeletons";

/**
 * Skeleton de página de Analíticas (header + selector + tabs + fila hero +
 * embudo). RSC-compatible: usable en `loading.tsx` y como fallback del
 * Suspense de la vista sin `"use client"`.
 */
export function AnalyticsPageSkeleton() {
  return (
    <div role="status" aria-label="Cargando analíticas" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-8 w-56 rounded-full" />
      </div>
      <Skeleton className="h-9 w-72 rounded-lg" />
      <KpiRowSkeleton />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
