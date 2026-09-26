"use client";

import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { orderNumberLabel, type OrderRow } from "@/modules/orders/domain/order";
import {
  dragActionFor,
  isKanbanStatus,
  KANBAN_COLUMNS,
  type DragAction,
  type KanbanStatus,
} from "@/modules/orders/domain/order-state";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";
import { KanbanColumn } from "./KanbanColumn";
import { OrderCard, type OrderCardAction } from "./OrderCard";

type OrdersKanbanProps = {
  canManage: boolean;
  onCardAction: (order: OrderRow, action: OrderCardAction) => void;
  /** Drop válido → acción resultante (confirm/fulfill abren confirmación;
   * report/verify abren su flujo). */
  onDropAction: (order: OrderRow, action: DragAction) => void;
};

/**
 * Tablero kanban (F11) sobre @dnd-kit/core: Pointer + Touch + Keyboard
 * (a11y y tablets — HTML5 DnD nativo no soporta touch). El drag está
 * LIMITADO a la whitelist de order-state (DRAG_ACTIONS): durante el arrastre
 * las columnas inválidas se atenúan y el drop en ellas es un no-op.
 */
export function OrdersKanban({ canManage, onCardAction, onDropAction }: OrdersKanbanProps) {
  const ordersById = useOrdersStore((s) => s.ordersById);
  const columns = useOrdersStore((s) => s.columns);
  const highlightId = useOrdersStore((s) => s.highlightId);
  const fetchColumn = useOrdersStore((s) => s.fetchColumn);

  const [dragging, setDragging] = useState<OrderRow | null>(null);

  const sensors = useSensors(
    // distance 6: el click simple abre el detalle sin iniciar drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const dragStatus =
    dragging !== null && isKanbanStatus(dragging.status) ? dragging.status : null;

  function handleDragStart(event: DragStartEvent) {
    const order = ordersById[String(event.active.id)];
    setDragging(order ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const order = dragging;
    setDragging(null);
    if (order === null || event.over === null) return;
    const from = order.status;
    const to = event.over.id as KanbanStatus;
    if (!isKanbanStatus(from) || from === to) return;
    const action = dragActionFor(from, to);
    if (action !== null) onDropAction(order, action);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
      <PendingProofsStrip
        // Lo que está en el tablero, no todo lo que pasó por el store: `ordersById`
        // no se poda y contaría pedidos que ya salieron de las columnas.
        orders={boardOrders(columns, ordersById)}
        canManage={canManage}
        onReview={(order) => onCardAction(order, { type: "verify_payment" })}
      />
      <div className="sidebar-scroll flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto pb-1">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            column={columns[status]}
            orders={columns[status].ids
              .map((id) => ordersById[id])
              .filter((order): order is OrderRow => order !== undefined)}
            highlightId={highlightId}
            canManage={canManage}
            validDropTarget={
              dragStatus === null ? null : status === dragStatus || dragActionFor(dragStatus, status) !== null
            }
            onLoadMore={() => {
              const loaded = columns[status].ids.length;
              void fetchColumn(status, Math.floor(loaded / 25) + 1);
            }}
            onCardAction={onCardAction}
          />
        ))}
      </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging !== null ? (
          <div className="w-64 rotate-2 shadow-overlay">
            <OrderCard
              order={dragging}
              highlighted={false}
              canManage={false}
              dragDisabled
              onAction={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * La franja del tablero (Cobros premium P3): los comprobantes que esperan
 * revisión, en TINTA — manda sobre una vista de trabajo cargada (criterio de
 * la dueña, §9.5.1). Cuenta solo las tarjetas ya cargadas: no promete un total
 * que el tablero no conoce. Sin pendientes, no existe.
 */
/** Los pedidos que están en alguna columna del tablero, en su orden. */
export function boardOrders(
  columns: Record<KanbanStatus, { ids: readonly string[] }>,
  ordersById: Record<string, OrderRow>,
): OrderRow[] {
  return KANBAN_COLUMNS.flatMap((status) => columns[status].ids)
    .map((id) => ordersById[id])
    .filter((order): order is OrderRow => order !== undefined);
}

export function PendingProofsStrip({
  orders,
  canManage,
  onReview,
}: {
  orders: readonly OrderRow[];
  canManage: boolean;
  onReview: (order: OrderRow) => void;
}) {
  const pending = orders.filter((order) => order.pending_payment);
  if (pending.length === 0) return null;
  const names = pending.slice(0, 2).map((order) => `${order.contact_name} · ${orderNumberLabel(order.order_number)}`);
  const extra = pending.length - names.length;
  return (
    <Island
      as="section"
      material="ink"
      aria-label="Comprobantes por revisar"
      className="flex shrink-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5"
    >
      <span className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-heading text-3xl leading-none font-bold tabular-nums">{pending.length}</span>
        <span className="text-sm">{pending.length === 1 ? "comprobante por revisar" : "comprobantes por revisar"}</span>
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground" title={names.join(" y ")}>
        {names.join(" y ")}
        {extra > 0 ? ` y ${String(extra)} más` : ""}
      </span>
      {canManage ? (
        <Button variant="contrast" size="sm" className="shrink-0 rounded-full" onClick={() => onReview(pending[0]!)}>
          Revisar el primero
        </Button>
      ) : null}
    </Island>
  );
}
