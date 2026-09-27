"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatShortDate } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { DocumentsList } from "@/modules/documents/public";
import {
  PAYMENT_STATE_LABELS,
  formatMoney,
  listOrders,
  orderNumberLabel,
  paymentProgress,
  type OrderDTO,
  type PaymentState,
} from "@/modules/orders/public";
import { firstNameOf } from "@/modules/inbox/domain/inbox-summary";
import type { ContextPanelHeading, ContextPanelProps } from "../registry";

/** Página chica: el panel muestra los últimos; la lista completa vive en Ventas. */
export const ORDERS_PANEL_PAGE_SIZE = 10;

const PAYMENT_TONE: Record<PaymentState, StatePillTone> = {
  unpaid: "neutral",
  partially_paid: "warning",
  paid: "success",
};

export function useOrdersHeading({ conversation }: ContextPanelProps): ContextPanelHeading {
  const name = conversation.contact.full_name || conversation.contact.phone || "el contacto";
  return { title: `De ${firstNameOf(name)}`, subtitle: "Con saldo primero" };
}

/** Con saldo primero; dentro de cada grupo, el más reciente arriba. */
export function sortOrdersForPanel(orders: readonly OrderDTO[]): OrderDTO[] {
  return [...orders].sort((a, b) => {
    const aPaid = a.payment_state === "paid" ? 1 : 0;
    const bPaid = b.payment_state === "paid" ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    return b.created_at.localeCompare(a.created_at);
  });
}

/**
 * Pedidos del contacto dentro del inbox (D5 del lienzo F4, la tarea que dejó
 * Cobros). Filtra en el SERVIDOR (`contact_id`, página chica), nunca trae todo
 * para filtrar aquí. Solo se monta con `orders:read` y la capacidad `sales`
 * (el registry lo gatea): sin permiso no hay llamada ni 403. Cada pedido con
 * su saldo y su barra de cobro; debajo, los documentos a nombre del contacto
 * (la misma `DocumentsList` del 360, que se gatea sola).
 */
export function OrdersPanel({ contactId, contextVersion }: ContextPanelProps) {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    listOrders({ contact_id: contactId, page: 1, page_size: ORDERS_PANEL_PAGE_SIZE, sort_by: "created_at", sort_dir: "desc" })
      .then((page) => {
        if (!cancelled) setOrders(sortOrdersForPanel(page.data));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, contextVersion, attempt]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <span className="grid size-14 place-items-center rounded-[18px] bg-muted text-muted-foreground">
          <ShoppingBag className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold">No pudimos traer los pedidos</p>
        <p className="max-w-60 text-xs text-muted-foreground">Se perdió la conexión. Lo demás de la conversación sigue a salvo.</p>
        <Button variant="outline" className="h-9 rounded-full" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="flex flex-col gap-3 p-4" role="status" aria-label="Cargando los pedidos">
        <Skeleton className="h-32 w-full rounded-[18px]" />
        <Skeleton className="h-20 w-full rounded-[18px]" />
      </div>
    );
  }

  return (
    <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-[18px] bg-muted text-muted-foreground">
            <ShoppingBag className="size-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold">Aún no tiene pedidos</p>
          <p className="max-w-60 text-xs text-muted-foreground">Cuando reserve, verás aquí su saldo y sus documentos.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}

      <DocumentsList subject={{ kind: "contact", id: contactId }} embedded className="mt-1 border-t border-border pt-4" />
    </div>
  );
}

function OrderCard({ order }: { order: OrderDTO }) {
  const settled = order.payment_state === "paid";
  const progress = paymentProgress(order);
  const title = order.items[0]?.product_name ?? "Pedido";
  const more = order.items.length > 1 ? ` +${String(order.items.length - 1)}` : "";

  return (
    <li className={cn("flex min-w-0 flex-col gap-2 rounded-[18px] border border-border bg-card p-3.5", settled && "opacity-85")}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">{orderNumberLabel(order.order_number)}</span>
        <StatePill tone={PAYMENT_TONE[order.payment_state]}>{PAYMENT_STATE_LABELS[order.payment_state]}</StatePill>
        {order.service_date !== null && (
          <span className="ml-auto truncate text-[11px] text-muted-foreground tabular-nums">Servicio el {formatShortDate(order.service_date)}</span>
        )}
      </div>
      <p className="truncate text-[13px] font-medium" title={`${title}${more}`}>
        {title}
        {more}
      </p>
      {!settled && (
        <>
          <div
            role="img"
            aria-label={`Cobrado el ${String(progress.percent)} por ciento`}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <span className="block h-full rounded-full bg-foreground" style={{ width: `${String(progress.percent)}%` }} />
          </div>
          <p className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs tabular-nums">
            <span>
              <b className="font-semibold">{formatMoney(order.paid_cents, order.currency)}</b>
              <span className="text-muted-foreground"> de {formatMoney(order.total_cents, order.currency)}</span>
            </span>
            <span className="text-muted-foreground">Saldo {formatMoney(order.balance_cents, order.currency)}</span>
          </p>
        </>
      )}
      {settled && <p className="text-xs text-muted-foreground tabular-nums">Pagado · {formatMoney(order.total_cents, order.currency)}</p>}
      <Button asChild variant="outline" className="h-9 w-full rounded-full text-[13px]">
        <Link href={`/orders/${order.id}`}>
          Abrir el pedido
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </Button>
    </li>
  );
}
