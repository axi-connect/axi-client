"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { DocumentsList } from "@/modules/documents/public";
import {
  formatMoney,
  orderNumberLabel,
  OrderStatusBadge,
  paymentProgress,
  type OrderDTO,
} from "@/modules/orders/public";

/**
 * Pedidos y documentos del contacto (F8 Cobros): los pedidos con saldo
 * primero, cada uno con su barra de cobro y el enlace a su rail; debajo, la
 * MISMA lista de documentos que ve el pedido, filtrada por persona — un papel
 * se archiva a su nombre y sobrevive al pedido. Props-in como
 * `ContactDealsCard`: la página trae los pedidos, la lista se trae sola.
 */
export function ContactOrdersDocumentsCard({
  contactId,
  orders,
}: {
  contactId: string;
  orders: OrderDTO[];
}) {
  const sorted = [...orders].sort((a, b) => {
    const aOpen = a.payment_state === "paid" ? 1 : 0;
    const bOpen = b.payment_state === "paid" ? 1 : 0;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-heading text-lg font-bold">
          Pedidos y documentos{" "}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            ({orders.length})
          </span>
        </h3>
        {orders.length > 0 ? (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            Con saldo primero
          </span>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin pedidos todavía. Los papeles se emiten desde cada pedido.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {sorted.map((order) => {
            const progress = paymentProgress(order);
            const settled = order.payment_state === "paid";
            return (
              <li key={order.id} className="py-3 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        {orderNumberLabel(order.order_number)}
                      </span>
                      <span className="truncate">
                        {order.items[0]?.product_name ?? "Pedido"}
                        {order.items.length > 1
                          ? ` +${order.items.length - 1}`
                          : ""}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {settled ? (
                        <>
                          <b className="font-medium text-foreground">Pagado</b>{" "}
                          · {formatMoney(order.total_cents, order.currency)}
                        </>
                      ) : (
                        <>
                          Falta{" "}
                          <b className="font-medium text-foreground">
                            {formatMoney(order.balance_cents, order.currency)}
                          </b>{" "}
                          de {formatMoney(order.total_cents, order.currency)}
                        </>
                      )}
                      {order.service_date !== null
                        ? ` · servicio el ${formatShortDate(order.service_date)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 rounded-full text-xs"
                  >
                    <Link href={`/orders/${order.id}`}>
                      <ExternalLink className="size-3.5" /> Abrir pedido
                    </Link>
                  </Button>
                </div>
                <div
                  role="img"
                  aria-label={
                    settled
                      ? "Cobrado por completo"
                      : `Cobrado el ${progress.percent} por ciento`
                  }
                  className={cn(
                    "mt-2.5 h-1 overflow-hidden rounded-full",
                    settled ? "bg-foreground" : "bg-muted",
                  )}
                >
                  {!settled ? (
                    <span
                      className="block h-full rounded-full bg-foreground"
                      style={{ width: `${progress.percent}%` }}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DocumentsList
        subject={{ kind: "contact", id: contactId }}
        className="mt-4"
      />
    </section>
  );
}
