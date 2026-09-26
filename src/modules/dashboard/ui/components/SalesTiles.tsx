"use client";

import { formatInteger } from "@/core/lib/commercial-units";
import { formatMillions } from "@/core/lib/format";
import { PERIOD_PHRASES, type OrderStatsDTO } from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { TileError, TileSkeleton } from "@/modules/dashboard/ui/components/parts";
import { BentoFigure, BentoLink, BentoTile } from "@/shared/components/features/bento";

const paidOrders = (n: number): string => (n === 1 ? "1 pedido pagado" : `${formatInteger(n)} pedidos pagados`);
const ordersToday = (n: number): string =>
  n === 0 ? "hoy no ha entrado ningún pedido" : n === 1 ? "hoy entró 1 pedido" : `hoy entraron ${formatInteger(n)} pedidos`;

/**
 * ¿Cómo van mis ventas? — GET /orders/stats. Dos fichas de un tema cada una
 * (§9.5): lo vendido y el ticket. Los pagos por verificar no van aquí: son
 * accionables y viven en la isla «Lo próximo».
 */
export function SalesTiles({ section, onRetry }: { section: Section<OrderStatsDTO>; onRetry: () => Promise<void> }) {
  if (section.status === "error") {
    return (
      <TileError
        label="Ventas"
        message={section.error ?? "No se pudieron cargar las ventas."}
        onRetry={onRetry}
        className="md:col-span-2"
      />
    );
  }
  if (section.data === null) {
    return (
      <>
        <TileSkeleton label="Vendido" />
        <TileSkeleton label="Ticket promedio" />
      </>
    );
  }

  const { kpis } = section.data;
  const phrase = PERIOD_PHRASES[kpis.period];
  const none = kpis.paid_orders === 0;
  return (
    <>
      <BentoTile label={`Vendido ${phrase}`} aside={<BentoLink href="/orders">Pedidos</BentoLink>}>
        {/* La unidad baja de línea si no cabe: «1.234 pedidos pagados» no entra junto a la cifra en 300 px. */}
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          <span className="font-heading text-4xl leading-none font-bold tracking-tight whitespace-nowrap tabular-nums">
            {formatMillions(kpis.sales_cents, kpis.currency)}
          </span>
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {none ? "aún sin pedidos pagados" : paidOrders(kpis.paid_orders)}
          </span>
        </p>
        {/* Piezas enteras, el corte en el «·» (§9.5, SummaryParts). */}
        <p className="text-muted-foreground text-xs">
          <span className="whitespace-nowrap">Solo lo pagado ·</span> <span className="whitespace-nowrap">{ordersToday(kpis.orders_today)}</span>
        </p>
      </BentoTile>
      <BentoTile label={`Ticket promedio ${phrase}`}>
        {none ? (
          <>
            <p className="text-sm font-semibold">Aún sin ticket</p>
            <p className="text-muted-foreground text-xs text-pretty">Aparece con el primer pedido pagado: lo vendido entre los pedidos pagados.</p>
          </>
        ) : (
          <>
            {/* En millones pasado el millón: un ticket de 9 cifras no cabe en una ficha de 300 px. */}
            <BentoFigure value={formatMillions(kpis.average_ticket_cents, kpis.currency)} unit="por pedido" />
            <p className="text-muted-foreground text-xs">Lo vendido entre {paidOrders(kpis.paid_orders)}</p>
          </>
        )}
      </BentoTile>
    </>
  );
}
