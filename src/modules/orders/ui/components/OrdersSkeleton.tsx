import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton estructural del panel (LOADING.md §1): tiles + 5 columnas con 3
 * tarjetas fantasma. Anchos DETERMINISTAS (nunca Math.random: rompe SSR).
 */
const CARD_WIDTHS = ["w-3/4", "w-2/3", "w-4/5"] as const;

export function OrdersSkeleton() {
  return (
    <div role="status" aria-label="Cargando pedidos" className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-2xl" />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, column) => (
          <div key={column} className="flex w-72 shrink-0 flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            {CARD_WIDTHS.map((width, card) => (
              <div key={card} className="space-y-2 rounded-2xl border border-border p-4">
                <Skeleton className={`h-4 ${width}`} />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
