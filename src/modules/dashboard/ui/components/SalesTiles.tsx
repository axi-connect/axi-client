"use client";

import { BadgeAlert, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { PERIOD_LABELS } from "@/modules/dashboard/domain/dashboard";
import { MetricTile } from "@/modules/dashboard/ui/components/MetricTile";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { OrderStatsDTO } from "@/modules/dashboard/domain/dashboard";

function TilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Cargando métricas de ventas"
          className="h-[74px] animate-pulse rounded-2xl border border-border bg-secondary"
        />
      ))}
    </div>
  );
}

/** ¿Cómo van mis ventas? — 4 KPIs desde GET /orders/stats. */
export function SalesTiles({ section }: { section: Section<OrderStatsDTO> }) {
  if (section.status === "loading" || section.status === "idle") return <TilesSkeleton />;
  if (section.status === "error" || section.data === null) {
    return (
      <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
        {section.error ?? "No se pudieron cargar las ventas."}
      </div>
    );
  }

  const { kpis } = section.data;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <MetricTile
        label="Pedidos hoy"
        value={String(kpis.orders_today)}
        icon={<ShoppingCart aria-hidden className="size-5" />}
      />
      <MetricTile
        label={`Ventas (${PERIOD_LABELS[kpis.period].toLowerCase()})`}
        value={formatMoney(kpis.sales_cents, kpis.currency)}
        icon={<TrendingUp aria-hidden className="size-5" />}
        hint={`${kpis.paid_orders} pagados`}
      />
      <MetricTile
        label="Ticket promedio"
        value={formatMoney(kpis.average_ticket_cents, kpis.currency)}
        icon={<Receipt aria-hidden className="size-5" />}
      />
      <MetricTile
        label="Por verificar"
        value={String(kpis.pending_verification)}
        icon={<BadgeAlert aria-hidden className="size-5" />}
        alert={kpis.pending_verification > 0}
      />
    </div>
  );
}
