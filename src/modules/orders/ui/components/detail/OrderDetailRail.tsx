"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MessageSquareText,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { relativeTime } from "@/core/lib/relative-time";
import { cn } from "@/core/lib/utils";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FieldList } from "@/shared/components/features/field-list";
import {
  formatMoney,
  mapOrderToRow,
  orderNumberLabel,
  type ConversationUsageDTO,
  type OrderDTO,
  type OrderEventDTO,
  type OrderPaymentDTO,
} from "@/modules/orders/domain/order";
import { canTransition } from "@/modules/orders/domain/order-state";
import {
  getConversationUsage,
  getOrder,
  getOrderEvents,
} from "@/modules/orders/infrastructure/services/orders-service.adapter";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";
import { OrderOriginBadge } from "@/modules/orders/ui/components/OrderOriginBadge";
import { OrderStatusBadge } from "@/modules/orders/ui/components/OrderStatusBadge";
import {
  TransitionConfirmDialog,
  type TransitionRequest,
} from "@/modules/orders/ui/components/kanban/TransitionConfirmDialog";
import { ReportPaymentDialog } from "@/modules/orders/ui/components/kanban/ReportPaymentDialog";
import { OrderTimeline } from "./OrderTimeline";
import { PaymentProofViewer } from "./PaymentProofViewer";
import { PaymentReviewDialog, type PaymentReview } from "./PaymentReviewDialog";

/**
 * Detalle del pedido como RAIL derecho (mockup "Cart"): panel persistente en
 * desktop (slot @sheet inline en el layout), overlay con scrim en móvil.
 * Items con separador punteado estilo ticket, bloque de totales y CTA de
 * ancho completo. URL navegable: /orders/[orderId] (ruta interceptada).
 */
const PAYMENT_STATUS_LABEL: Record<OrderPaymentDTO["status"], string> = {
  reported: "Reportado",
  verified: "Verificado",
  rejected: "Rechazado",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

/** Separador punteado con muescas laterales (ticket del mockup). */
function TicketSeparator() {
  return (
    <div aria-hidden className="relative -mx-4 my-3">
      <div className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/50" />
      <div className="mx-5 border-t-2 border-dashed border-border" />
      <div className="absolute top-1/2 right-0 size-4 translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/50" />
    </div>
  );
}

export function OrderDetailRail({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("orders:manage");
  const refreshOrderInBoard = useOrdersStore((s) => s.refreshOrder);
  const fetchStats = useOrdersStore((s) => s.fetchStats);

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [events, setEvents] = useState<OrderEventDTO[]>([]);
  const [usage, setUsage] = useState<ConversationUsageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitionReq, setTransitionReq] = useState<TransitionRequest | null>(null);
  const [reportingPayment, setReportingPayment] = useState(false);
  const [review, setReview] = useState<PaymentReview | null>(null);

  const load = useCallback(async () => {
    try {
      const [dto, timeline] = await Promise.all([getOrder(orderId), getOrderEvents(orderId)]);
      setOrder(dto);
      setEvents(timeline.data);
      if (dto.conversation_id !== null) {
        // Metering de la conversación de origen; best-effort (permiso/errores)
        getConversationUsage(dto.conversation_id)
          .then(setUsage)
          .catch(() => setUsage(null));
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Refresh en vivo: el store lo dispara al recibir eventos WS de este pedido
  useEffect(() => {
    function onRefresh(event: Event) {
      const detail = (event as CustomEvent<{ order_id: string }>).detail;
      if (detail.order_id === orderId) void load();
    }
    window.addEventListener("orders:detail:refresh", onRefresh);
    return () => window.removeEventListener("orders:detail:refresh", onRefresh);
  }, [orderId, load]);

  async function afterMutation() {
    await Promise.all([load(), refreshOrderInBoard(orderId), fetchStats()]);
  }

  const reportedPayments = order?.payments.filter((p) => p.status === "reported") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:static lg:z-auto lg:h-full">
      {/* Scrim solo móvil: en desktop el rail convive con el tablero */}
      <button
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-black/40 lg:hidden"
        onClick={onClose}
      />
      <aside
        aria-label="Detalle del pedido"
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-secondary/50 backdrop-blur-none lg:w-[380px] lg:rounded-2xl lg:border"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-2 border-b border-border bg-background/80 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-base font-semibold">
                {order !== null ? orderNumberLabel(order.order_number) : "Pedido"}
              </h2>
              {order !== null ? <OrderStatusBadge status={order.status} /> : null}
            </div>
            {order !== null ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar alt={order.contact.full_name ?? "Cliente"} fallback={order.contact.full_name ?? "C"} size={18} />
                <span className="truncate">{order.contact.full_name ?? "Cliente"}</span>
                <OrderOriginBadge origin={order.created_by_type} />
                <span>{relativeTime(order.created_at)}</span>
              </div>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" className="shrink-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </header>

        {/* Cuerpo scrolleable */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3" role="status" aria-label="Cargando pedido">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : order === null ? (
            <p className="text-sm text-muted-foreground">El pedido ya no existe.</p>
          ) : (
            <>
              {/* Artículos */}
              <section className="rounded-2xl border border-border bg-background p-4">
                <SectionTitle>Artículos</SectionTitle>
                <ul className="mt-3 space-y-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Avatar alt={item.product_name} fallback={item.product_name} size={36} shape="square" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.quantity}× {item.product_name}
                        </p>
                        {item.variant_label !== null ? (
                          <p className="truncate text-xs text-muted-foreground">{item.variant_label}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney(item.total_cents, item.currency)}
                      </p>
                    </li>
                  ))}
                </ul>

                <TicketSeparator />

                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(order.subtotal_cents, order.currency)}</dd>
                  </div>
                  {order.discount_cents > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Descuento</dt>
                      <dd className="tabular-nums">−{formatMoney(order.discount_cents, order.currency)}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-baseline justify-between pt-1">
                    <dt className="text-sm font-semibold uppercase">Total</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {formatMoney(order.total_cents, order.currency)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{order.currency}</span>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Pagos */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Pagos</SectionTitle>
                  {canManage && canTransition(order.status, "payment_reported") ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReportingPayment(true)}>
                      <Receipt className="size-3.5" /> Registrar pago
                    </Button>
                  ) : null}
                </div>
                {order.payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aún no hay pagos reportados.</p>
                ) : (
                  order.payments.map((payment) => (
                    <div key={payment.id} className="space-y-3 rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">
                          {payment.method_label ?? "Pago reportado"}
                          {payment.amount_cents !== null
                            ? ` · ${formatMoney(payment.amount_cents, payment.currency)}`
                            : ""}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            payment.status === "verified" && "bg-success/12 text-success",
                            payment.status === "reported" && "bg-warning/15 text-warning",
                            payment.status === "rejected" && "bg-destructive/10 text-destructive",
                          )}
                        >
                          {PAYMENT_STATUS_LABEL[payment.status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {payment.reference !== null ? `Ref. ${payment.reference} · ` : ""}
                        {relativeTime(payment.created_at)}
                      </p>
                      <PaymentProofViewer orderId={order.id} payment={payment} />
                      {canManage && payment.status === "reported" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setReview({ payment, action: "verify" })}
                          >
                            <ShieldCheck className="size-3.5" /> Verificar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => setReview({ payment, action: "reject" })}
                          >
                            Rechazar…
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </section>

              {/* Actividad */}
              <section className="space-y-3">
                <SectionTitle>Actividad</SectionTitle>
                <OrderTimeline events={events} />
              </section>

              {/* Detalles */}
              <section className="space-y-2 rounded-2xl border border-border bg-background p-4 text-sm">
                <SectionTitle>Detalles</SectionTitle>
                <FieldList
                  className="pt-1"
                  items={[
                    {
                      label: "Origen",
                      value: <OrderOriginBadge origin={order.created_by_type} />,
                    },
                    {
                      label: "Conversación",
                      value:
                        order.conversation_id !== null ? (
                          <Link
                            href={`/workspace/inbox/${order.conversation_id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <MessageSquareText className="size-3.5" /> Abrir
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : null,
                    },
                    {
                      label: (
                        <span className="flex items-center gap-1">
                          <Sparkles className="size-3.5 text-accent-violet" /> Costo IA
                        </span>
                      ),
                      value:
                        usage !== null ? (
                          <span
                            className="tabular-nums"
                            title={`${usage.tokens_input + usage.tokens_output} tokens · ${usage.ai_requests} llamadas`}
                          >
                            US$ {usage.cost_usd.toFixed(4)}
                          </span>
                        ) : null,
                    },
                    {
                      label: "Notas",
                      block: true,
                      value:
                        order.notes !== null && order.notes !== "" ? (
                          <span className="mt-0.5 block rounded-lg bg-secondary/60 p-2 text-xs">
                            «{order.notes}»
                          </span>
                        ) : null,
                    },
                    {
                      label: "Motivo de cancelación",
                      block: true,
                      value:
                        order.cancellation_reason !== null ? (
                          <span className="mt-0.5 block rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                            «{order.cancellation_reason}»
                          </span>
                        ) : null,
                    },
                  ]}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer de acciones (CTA de ancho completo, mockup "Confirm Order") */}
        {order !== null && canManage ? (
          <footer className="space-y-2 border-t border-border bg-background/80 p-4">
            {canTransition(order.status, "confirmed") ? (
              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={() => setTransitionReq({ order: mapOrderToRow(order), action: "confirm" })}
              >
                <ShieldCheck className="size-4" /> Confirmar pedido
              </Button>
            ) : null}
            {reportedPayments.length > 0 ? (
              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={() => setReview({ payment: reportedPayments[0], action: "verify" })}
              >
                <ShieldCheck className="size-4" /> Verificar pago
              </Button>
            ) : null}
            {order.status === "paid" ? (
              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={() => setTransitionReq({ order: mapOrderToRow(order), action: "fulfill" })}
              >
                <PackageCheck className="size-4" /> Marcar entregado
              </Button>
            ) : null}
            {canTransition(order.status, "cancelled") ? (
              <Button
                variant="ghost"
                className="w-full rounded-full text-destructive hover:text-destructive"
                onClick={() => setTransitionReq({ order: mapOrderToRow(order), action: "cancel" })}
              >
                Cancelar pedido
              </Button>
            ) : null}
          </footer>
        ) : null}

        {/* Diálogos */}
        {transitionReq !== null ? (
          <TransitionConfirmDialog
            request={transitionReq}
            onOpenChange={(open) => {
              if (!open) {
                setTransitionReq(null);
                void afterMutation();
              }
            }}
          />
        ) : null}
        {reportingPayment && order !== null ? (
          <ReportPaymentDialog
            order={mapOrderToRow(order)}
            onOpenChange={(open) => {
              if (!open) {
                setReportingPayment(false);
                void afterMutation();
              }
            }}
          />
        ) : null}
        <PaymentReviewDialog
          orderId={orderId}
          review={review}
          onOpenChange={(open) => {
            if (!open) setReview(null);
          }}
          onDone={() => void afterMutation()}
        />
      </aside>
    </div>
  );
}
