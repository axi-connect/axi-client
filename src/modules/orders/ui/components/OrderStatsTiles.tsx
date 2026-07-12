"use client";

import { ShoppingCart, TrendingUp, Receipt, BadgeAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney, type OrderStatsDTO } from "@/modules/orders/domain/order";

/**
 * Stat tiles del panel (mockup: cards en capas con radios generosos).
 * Números tabulares; jerarquía por peso/tamaño, no por color (DESIGN §4).
 */
function Tile({
  label,
  value,
  icon,
  alert,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          alert ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

const PERIOD_LABELS = { today: "hoy", "7d": "7 días", "30d": "30 días" } as const;

export function OrderStatsTiles({ stats }: { stats: OrderStatsDTO | null }) {
  if (stats === null) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            role="status"
            aria-label="Cargando métricas"
            className="h-[74px] animate-pulse rounded-2xl border border-border bg-secondary"
          />
        ))}
      </div>
    );
  }

  const { kpis } = stats;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile
        label="Pedidos hoy"
        value={String(kpis.orders_today)}
        icon={<ShoppingCart aria-hidden className="size-5" />}
      />
      <Tile
        label={`Ventas (${PERIOD_LABELS[kpis.period]})`}
        value={formatMoney(kpis.sales_cents, kpis.currency)}
        icon={<TrendingUp aria-hidden className="size-5" />}
      />
      <Tile
        label="Ticket promedio"
        value={formatMoney(kpis.average_ticket_cents, kpis.currency)}
        icon={<Receipt aria-hidden className="size-5" />}
      />
      <Tile
        label="Por verificar"
        value={String(kpis.pending_verification)}
        icon={<BadgeAlert aria-hidden className="size-5" />}
        alert={kpis.pending_verification > 0}
      />
    </div>
  );
}
