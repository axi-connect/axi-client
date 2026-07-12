"use client";

import { LayoutGrid, List, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  useOrdersStore,
  type OrdersView,
  type StatsPeriod,
} from "@/modules/orders/infrastructure/stores/orders.store";

/**
 * Header del panel (mockup): título Nexa + subtítulo en acento coral con el
 * dato vivo del día, y a la derecha el período, el sonido y el conmutador
 * segmentado pill Kanban/Tabla (activo en coral, como Delivery|Dine In).
 */
function SegmentedToggle({
  view,
  onChange,
}: {
  view: OrdersView;
  onChange: (view: OrdersView) => void;
}) {
  const options: Array<{ value: OrdersView; label: string; icon: React.ReactNode }> = [
    { value: "kanban", label: "Tablero", icon: <LayoutGrid aria-hidden className="size-3.5" /> },
    { value: "table", label: "Tabla", icon: <List aria-hidden className="size-3.5" /> },
  ];
  return (
    <div
      role="tablist"
      aria-label="Vista de pedidos"
      className="flex items-center rounded-full border border-border bg-secondary/60 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={view === option.value}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function OrdersHeader() {
  const view = useOrdersStore((s) => s.view);
  const setView = useOrdersStore((s) => s.setView);
  const soundEnabled = useOrdersStore((s) => s.soundEnabled);
  const toggleSound = useOrdersStore((s) => s.toggleSound);
  const statsPeriod = useOrdersStore((s) => s.statsPeriod);
  const setStatsPeriod = useOrdersStore((s) => s.setStatsPeriod);
  const stats = useOrdersStore((s) => s.stats);

  const ordersToday = stats?.kpis.orders_today ?? null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-sm font-medium text-brand">
          {ordersToday === null
            ? "Gestiona los pedidos de tus clientes en tiempo real"
            : ordersToday === 0
              ? "Aún no hay pedidos hoy"
              : `${ordersToday} ${ordersToday === 1 ? "pedido nuevo" : "pedidos nuevos"} hoy`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statsPeriod} onValueChange={(value) => setStatsPeriod(value as StatsPeriod)}>
          <SelectTrigger className="w-32 rounded-full" aria-label="Período de métricas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="7d">7 días</SelectItem>
            <SelectItem value="30d">30 días</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          aria-label={soundEnabled ? "Silenciar pedidos nuevos" : "Activar sonido de pedidos"}
          className="rounded-full"
          onClick={toggleSound}
        >
          {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Button>

        <SegmentedToggle view={view} onChange={setView} />
      </div>
    </div>
  );
}
