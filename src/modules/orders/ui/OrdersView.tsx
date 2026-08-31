"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useNotificationsStore } from "@/modules/notifications/infrastructure/stores/notifications.store";
import type { OrderRow } from "@/modules/orders/domain/order";
import { KANBAN_COLUMNS, type DragAction } from "@/modules/orders/domain/order-state";
import { useOrdersSocket } from "@/modules/orders/infrastructure/realtime/use-orders-socket";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import { OrdersHeader } from "./components/OrdersHeader";
import { OrderStatsTiles } from "./components/OrderStatsTiles";
import { OrdersToaster } from "./components/OrdersToaster";
import { OrdersKanban } from "./components/kanban/OrdersKanban";
import { ReportPaymentDialog } from "./components/kanban/ReportPaymentDialog";
import {
  TransitionConfirmDialog,
  type TransitionRequest,
} from "./components/kanban/TransitionConfirmDialog";
import type { OrderCardAction } from "./components/kanban/OrderCard";
import { OrderDetailRoute } from "./OrderDetailRoute";
import { OrdersTable } from "./tables/OrdersTable";

/**
 * Panel de pedidos en tiempo real (F11). Full-bleed (patrón workspace):
 * header + KPIs + tablero/tabla conmutables; el detalle vive como rail
 * derecho vía el slot @sheet (ruta interceptada /orders/[orderId]).
 *
 * Mientras está montado suprime los toasts globales `order.*` (el panel
 * presenta los suyos): el badge de la campana sigue contando.
 */
export function OrdersView({ initialOrderId }: { initialOrderId?: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("orders:manage");

  const view = useOrdersStore((s) => s.view);
  const stats = useOrdersStore((s) => s.stats);
  const columns = useOrdersStore((s) => s.columns);
  const boardLoaded = useOrdersStore((s) => s.boardLoaded);
  const hydratePreferences = useOrdersStore((s) => s.hydratePreferences);
  const fetchBoard = useOrdersStore((s) => s.fetchBoard);

  const suppressToasts = useNotificationsStore((s) => s.suppressToasts);
  const unsuppressToasts = useNotificationsStore((s) => s.unsuppressToasts);

  const [transitionReq, setTransitionReq] = useState<TransitionRequest | null>(null);
  const [reportingFor, setReportingFor] = useState<OrderRow | null>(null);

  useOrdersSocket();

  useEffect(() => {
    hydratePreferences();
    void fetchBoard();
  }, [hydratePreferences, fetchBoard]);

  useEffect(() => {
    suppressToasts("order.");
    return () => unsuppressToasts("order.");
  }, [suppressToasts, unsuppressToasts]);

  function openOrder(orderId: string) {
    router.push(`/orders/${orderId}`);
  }

  function handleCardAction(order: OrderRow, action: OrderCardAction) {
    switch (action.type) {
      case "view":
      case "verify_payment":
        openOrder(order.id);
        break;
      case "confirm":
        setTransitionReq({ order, action: "confirm" });
        break;
      case "fulfill":
        setTransitionReq({ order, action: "fulfill" });
        break;
      case "cancel":
        setTransitionReq({ order, action: "cancel" });
        break;
      case "report_payment":
        setReportingFor(order);
        break;
    }
  }

  function handleDropAction(order: OrderRow, action: DragAction) {
    if (action === "confirm") setTransitionReq({ order, action: "confirm" });
    else if (action === "fulfill") setTransitionReq({ order, action: "fulfill" });
    else if (action === "report_payment") setReportingFor(order);
    else openOrder(order.id); // verify_payment: la verificación vive en el detalle
  }

  const boardEmpty =
    boardLoaded && KANBAN_COLUMNS.every((status) => columns[status].ids.length === 0);

  return (
    <div className="relative flex h-full min-h-0">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <OrdersHeader />
        <OrderStatsTiles stats={stats} />

        <div className="min-h-0 flex-1">
          {view === "table" ? (
            <OrdersTable onOpenOrder={openOrder} />
          ) : boardEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <GlassGlyph kind="money" tier="lg" />
              <div>
                <p className="font-medium">Aún no hay pedidos</p>
                <p className="text-sm text-muted-foreground">
                  Los pedidos que tome tu agente IA por WhatsApp aparecerán aquí al instante.
                </p>
              </div>
            </div>
          ) : (
            <OrdersKanban
              canManage={canManage}
              onCardAction={handleCardAction}
              onDropAction={handleDropAction}
            />
          )}
        </div>
      </main>

      {/* Hard-nav a /orders/[id]: el rail se monta inline (sin slot) */}
      {initialOrderId !== undefined ? (
        <OrderDetailRoute orderId={initialOrderId} closeBehavior="replace" />
      ) : null}

      <OrdersToaster onViewOrder={openOrder} />

      {transitionReq !== null ? (
        <TransitionConfirmDialog
          request={transitionReq}
          onOpenChange={(open) => {
            if (!open) setTransitionReq(null);
          }}
        />
      ) : null}
      {reportingFor !== null ? (
        <ReportPaymentDialog
          order={reportingFor}
          onOpenChange={(open) => {
            if (!open) setReportingFor(null);
          }}
        />
      ) : null}
    </div>
  );
}
