import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeletons estructurales de Analíticas (solo primera carga, LOADING.md §1).
 * Forma-fiel por sección y anchos deterministas (nunca aleatorios: SSR).
 */

/** Fila hero de KPIs: 2 protagonistas grandes + 4 tiles secundarias. */
export function KpiRowSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando indicadores"
      className="grid grid-cols-2 gap-4 lg:grid-cols-6"
    >
      <Skeleton className="col-span-2 h-40 rounded-2xl lg:row-span-2" />
      <Skeleton className="col-span-2 h-40 rounded-2xl lg:row-span-2" />
      <Skeleton className="h-[4.5rem] rounded-2xl" />
      <Skeleton className="h-[4.5rem] rounded-2xl" />
      <Skeleton className="h-[4.5rem] rounded-2xl" />
      <Skeleton className="h-[4.5rem] rounded-2xl" />
    </div>
  );
}

/** Anchos decrecientes: la silueta ya insinúa el embudo. */
const FUNNEL_WIDTHS = ["100%", "72%", "54%", "38%", "30%", "24%"] as const;

export function FunnelSkeleton() {
  return (
    <div role="status" aria-label="Cargando embudo" className="space-y-3">
      {FUNNEL_WIDTHS.map((width) => (
        <div key={width} className="flex items-center gap-3">
          <Skeleton className="h-4 w-28 shrink-0 rounded-md" />
          <Skeleton className="h-7 rounded-lg" style={{ width }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <Skeleton
      role="status"
      aria-label="Cargando gráfico"
      className="w-full rounded-xl"
      style={{ height }}
    />
  );
}
