"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { OrderRow } from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS, type KanbanStatus } from "@/modules/orders/domain/order-state";
import type { ColumnState } from "@/modules/orders/infrastructure/stores/orders.store";
import { OrderCard, type OrderCardAction } from "./OrderCard";

type KanbanColumnProps = {
  status: KanbanStatus;
  column: ColumnState;
  orders: OrderRow[];
  highlightId: string | null;
  canManage: boolean;
  /** null = no hay drag activo; true/false = destino válido/inválido. */
  validDropTarget: boolean | null;
  onLoadMore: () => void;
  onCardAction: (order: OrderRow, action: OrderCardAction) => void;
};

/** Columna droppable: durante un drag, los destinos inválidos se atenúan. */
export function KanbanColumn({
  status,
  column,
  orders,
  highlightId,
  canManage,
  validDropTarget,
  onLoadMore,
  onCardAction,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`Columna ${ORDER_STATUS_LABELS[status]}`}
      className={cn(
        "flex h-full w-72 shrink-0 snap-start flex-col rounded-2xl bg-secondary/50 transition-opacity",
        validDropTarget === false && "opacity-40",
        validDropTarget === true && isOver && "ring-2 ring-ring",
      )}
    >
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {ORDER_STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {column.total}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {column.error !== null ? (
          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{column.error}</p>
        ) : null}

        <AnimatePresence initial={false}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              highlighted={highlightId === order.id}
              canManage={canManage}
              onAction={onCardAction}
            />
          ))}
        </AnimatePresence>

        {orders.length === 0 && !column.loading && column.error === null ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Sin pedidos
          </div>
        ) : null}

        {column.loading ? (
          <div role="status" aria-label="Cargando" className="flex justify-center py-2">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {column.hasMore && !column.loading ? (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onLoadMore}>
            Cargar más
          </Button>
        ) : null}
      </div>
    </section>
  );
}
