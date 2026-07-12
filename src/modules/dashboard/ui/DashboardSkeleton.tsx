/**
 * Skeleton estructural del dashboard (silueta: banner + tiles + grid de cards),
 * para que el render final no "salte". Anchos deterministas (nunca random,
 * rompe hidratación SSR). Usable en `loading.tsx` sin `"use client"`.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando dashboard">
      {/* Banner */}
      <div className="h-28 animate-pulse rounded-3xl border border-border bg-secondary" />

      {/* Tiles de ventas */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-2xl border border-border bg-secondary"
          />
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-border bg-secondary"
          />
        ))}
      </div>
    </div>
  );
}
