"use client";

import { Package } from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CHART_COLORS } from "@/modules/dashboard/ui/components/charts/chart-theme";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { TopProductsDTO } from "@/modules/dashboard/domain/dashboard";

/** Top productos vendidos — GET /orders/top-products: barra proporcional a unidades. */
export function TopProductsCard({ section }: { section: Section<TopProductsDTO> }) {
  if (section.status === "loading" || section.status === "idle") {
    return (
      <DashboardCard title="Top productos">
        <div className="h-40 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (section.status === "error" || section.data === null) {
    return (
      <DashboardCard title="Top productos">
        <p className="text-sm text-muted-foreground">
          {section.error ?? "No se pudieron cargar los productos."}
        </p>
      </DashboardCard>
    );
  }

  const items = section.data.items;
  const maxUnits = items.reduce((max, item) => Math.max(max, item.units), 0) || 1;

  return (
    <DashboardCard title="Top productos">
      {items.length === 0 ? (
        <CardEmpty
          icon={<Package aria-hidden className="size-6" />}
          message="Aún no hay productos vendidos en este período."
        />
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.variant_id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">
                    {index + 1}.
                  </span>
                  {item.product_name}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{item.units}</span> uds
                  {" · "}
                  <span className="tabular-nums">{formatMoney(item.revenue_cents, "COP")}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.units / maxUnits) * 100}%`,
                    background: CHART_COLORS.brand,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
