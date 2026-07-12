"use client";

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
import type { OrderRow } from "@/modules/orders/domain/order";
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
      <div className="flex h-full min-h-0 snap-x gap-3 overflow-x-auto pb-1">
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
