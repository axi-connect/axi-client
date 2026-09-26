"use client";

import Link from "next/link";

import { formatDayTime, formatMillions } from "@/core/lib/format";
import { contactNextUp, type NextUpOrder } from "@/modules/crm/domain/contact-summary";
import type { DealDTO } from "@/modules/crm/domain/deal";
import type { ContactJourneyDTO } from "@/modules/crm/domain/journey";
import { BentoTile, InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * «Con nosotros» (lienzo CRM premium F2): lo pagado en sus pedidos y lo que
 * sigue abierto en oportunidades. Solo con lo que la ficha ya trajo; sin
 * permiso de pedidos (`orders === null`) la ficha no se pinta (§9.5, datos por
 * rol): el bento se reacomoda.
 */
export function ContactValueTile({
  orders,
  deals,
  className,
}: {
  orders: ReadonlyArray<NextUpOrder & { total_cents: number }> | null;
  deals: readonly DealDTO[];
  className?: string;
}) {
  if (orders === null) return null;
  const currency = orders[0]?.currency ?? deals[0]?.currency ?? "COP";
  const paid = orders.reduce((sum, order) => sum + Math.max(0, order.total_cents - order.balance_cents), 0);
  const owing = orders.reduce((sum, order) => sum + (order.payment_state === "paid" ? 0 : order.balance_cents), 0);
  const open = deals.filter((deal) => deal.status === "open");
  const openValue = open.reduce((sum, deal) => sum + (deal.value_cents ?? 0), 0);

  return (
    <BentoTile label="Con nosotros" className={className}>
      {orders.length === 0 ? (
        <p className="font-heading text-2xl leading-tight font-bold">Aún sin pedidos</p>
      ) : (
        // Sin unidad al lado: un monto de 8 cifras en una ficha de un cuarto de
        // ancho empujaba «pagados» fuera de la caja. La unidad va en la línea.
        <p className="truncate font-heading text-3xl leading-none font-bold tracking-tight tabular-nums" title={formatMillions(paid, currency)}>
          {formatMillions(paid, currency)}
        </p>
      )}
      <p className="text-[13px] text-pretty text-muted-foreground">
        {orders.length === 0
          ? "Cuando compre, aquí verás lo pagado."
          : `Pagados en ${orders.length === 1 ? "1 pedido" : `${orders.length} pedidos`} · ${owing > 0 ? `debe ${formatMillions(owing, currency)}` : "al día"}`}
      </p>
      <p className="mt-auto text-xs text-pretty text-muted-foreground">
        {open.length === 0
          ? "Sin oportunidades abiertas."
          : `${open.length === 1 ? "1 oportunidad abierta" : `${open.length} oportunidades abiertas`}${openValue > 0 ? ` por ${formatMillions(openValue, currency)}` : ""}`}
      </p>
    </BentoTile>
  );
}

/**
 * «Lo próximo» de la ficha (lienzo CRM premium F2): UNA isla, en cristal
 * (material por defecto), con lo más grave según `contactNextUp` —se enfría,
 * saldo, próxima insistencia o al día—. Mientras llega el recorrido que la
 * decide pinta su silueta: no una isla y luego otra (§9.5).
 */
export function ContactNextUpIsland({
  journey,
  orders,
  followUpHref,
  className,
}: {
  /** `undefined` = el recorrido aún no llega; `null` = no hay o no se pudo leer. */
  journey: ContactJourneyDTO | null | undefined;
  orders: readonly NextUpOrder[];
  followUpHref: string;
  className?: string;
}) {
  if (journey === undefined) return <Skeleton className={`h-[168px] rounded-3xl ${className ?? ""}`} />;
  const next = contactNextUp(journey, orders, (iso) => `el ${formatDayTime(iso)}`);

  return (
    <InkIsland label="Lo próximo" glow={next.kind === "clear" ? "ai" : "brand"} className={`gap-2 p-5 ${className ?? ""}`}>
      <Kicker>Lo próximo</Kicker>
      {next.kind === "balance" ? (
        <p className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="font-heading text-xl leading-tight font-bold">{next.title}</span>
          <span className="font-heading text-base font-bold whitespace-nowrap tabular-nums">{formatMillions(next.balanceCents, next.currency)}</span>
        </p>
      ) : (
        <p className="font-heading text-xl leading-tight font-bold text-pretty">{next.title}</p>
      )}
      <p className="text-xs text-pretty text-muted-foreground">{next.detail}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {next.kind === "cooling" && (
          <>
            <Button asChild variant="contrast" size="sm" className="rounded-full">
              <Link href={followUpHref}>Agendar seguimiento</Link>
            </Button>
            <Button asChild variant="glass" size="sm">
              <Link href={`/crm/pipeline/deal/${next.dealId}`}>Ver la oportunidad</Link>
            </Button>
          </>
        )}
        {next.kind === "balance" && (
          <Button asChild variant="contrast" size="sm" className="rounded-full">
            <Link href={`/orders/${next.orderId}`}>Abrir el pedido</Link>
          </Button>
        )}
        {next.kind === "cadence" && (
          <Button asChild variant="glass" size="sm">
            <Link href={`/crm/pipeline/deal/${next.dealId}`}>Ver la oportunidad</Link>
          </Button>
        )}
      </div>
    </InkIsland>
  );
}
