"use client";

import { cn } from "@/core/lib/utils";
import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import { PERIOD_PHRASES, type DashboardPeriod, type TopProductsDTO } from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { TileError, TileSkeleton } from "@/modules/dashboard/ui/components/parts";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";

const units = (n: number): string => `${formatInteger(n)} ${n === 1 ? "ud" : "uds"}`;

/**
 * Lo más vendido — GET /orders/top-products: el nombre y el importe arriba,
 * la barra por unidades debajo (el primero en el gradiente de marca). El
 * nombre largo se trunca con su `title` (§9.5, texto en fichas estrechas).
 */
export function TopProductsCard({
  section,
  period,
  onRetry,
  className,
}: {
  section: Section<TopProductsDTO>;
  period: DashboardPeriod;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  // Con dato, el período del DATO (auditoría, P2-4).
  const label = `Lo más vendido ${PERIOD_PHRASES[section.data?.period ?? period]}`;
  if (section.status === "error") {
    return <TileError label={label} message={section.error ?? "No se pudieron cargar los productos."} onRetry={onRetry} className={className} />;
  }
  if (section.data === null) return <TileSkeleton label={label} lines={4} className={className} />;

  const items = section.data.items;
  const maxUnits = items.reduce((max, item) => Math.max(max, item.units), 0) || 1;
  const aside = <BentoLink href="/catalog">Catálogo</BentoLink>;

  if (items.length === 0) {
    return (
      <BentoTile label={label} aside={aside} busy={section.status === "loading"} className={className}>
        <p className="text-sm font-semibold">Aún sin ventas en este período</p>
        <p className="text-muted-foreground text-xs text-pretty">El ranking arranca con la primera, ordenado por unidades vendidas.</p>
      </BentoTile>
    );
  }

  return (
    <BentoTile label={label} aside={aside} busy={section.status === "loading"} className={cn("gap-1", className)}>
      <ol className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.variant_id} className="flex flex-col gap-1.5 py-2 last:pb-0">
            <div className="flex min-w-0 items-baseline gap-2.5">
              <span className="text-muted-foreground w-3.5 shrink-0 text-xs tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm" title={item.product_name}>
                {item.product_name}
              </span>
              <span className="shrink-0 text-xs font-semibold whitespace-nowrap tabular-nums">{formatMoney(item.revenue_cents, "COP")}</span>
            </div>
            <div className="flex items-center gap-2.5 pl-6">
              <span aria-hidden="true" className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                <span
                  className={cn("block h-full rounded-full", index === 0 ? "bg-brand-gradient" : "bg-foreground/80")}
                  style={{ width: `${String((item.units / maxUnits) * 100)}%` }}
                />
              </span>
              <span className="text-muted-foreground min-w-11 text-right text-[11px] whitespace-nowrap tabular-nums">{units(item.units)}</span>
            </div>
          </li>
        ))}
      </ol>
    </BentoTile>
  );
}
