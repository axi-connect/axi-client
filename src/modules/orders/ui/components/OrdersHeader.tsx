"use client";

import { LayoutGrid, List, Volume2, VolumeX } from "lucide-react";
import { SegmentedControl } from "@/shared/components/ui/segmented";
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
 * Header del panel: título Nexa + subtítulo en acento coral con el dato vivo
 * del día, y a la derecha el período, el sonido y el conmutador de vista.
 */
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

        <SegmentedControl
          value={view}
          onValueChange={setView}
          label="Vista de pedidos"
          items={[
            { value: "kanban" as OrdersView, label: "Tablero", icon: LayoutGrid },
            { value: "table" as OrdersView, label: "Tabla", icon: List },
          ]}
        />
      </div>
    </div>
  );
}
