import { cn } from "@/core/lib/utils";
import type { RateRow } from "@/modules/analytics/domain/live-rates";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * La lista de las dos tarjetas del método comercial en Conversión: etiqueta →
 * cifra, el divisor en la línea secundaria y una regla fina a la derecha (el
 * único indicador de la fila). Ficha, no tabla.
 */
export function RateList({ rows, label }: { rows: readonly RateRow[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-px py-2.5 first:pt-0 last:pb-0">
          <span className="text-[12px] text-muted-foreground">{row.label}</span>
          {row.pct !== null ? (
            <span aria-hidden className="row-span-3 block h-1 w-24 shrink-0 self-center overflow-hidden rounded-full bg-secondary">
              <span
                className={cn("block h-full rounded-full", row.primary === true ? "bg-brand" : "bg-brand/45")}
                style={{ width: `${String(Math.min(100, Math.max(2, row.pct)))}%` }}
              />
            </span>
          ) : null}
          <span className="col-start-1 text-[15px] font-medium text-foreground tabular-nums">{row.value}</span>
          <span className="col-start-1 text-[12.5px] text-muted-foreground tabular-nums">{row.secondary}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skeleton de las dos tarjetas: cuatro filas de etiqueta, cifra y regla. */
export function RateListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="h-1 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
