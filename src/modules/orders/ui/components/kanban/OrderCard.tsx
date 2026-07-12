"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, EllipsisVertical, Eye, Paperclip, PackageCheck, Receipt, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { relativeTime } from "@/core/lib/relative-time";
import { fade, spring } from "@/core/styles/motion";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { formatMoney, orderNumberLabel, type OrderRow } from "@/modules/orders/domain/order";
import { canTransition } from "@/modules/orders/domain/order-state";
import { OrderOriginBadge } from "@/modules/orders/ui/components/OrderOriginBadge";

export type OrderCardAction =
  | { type: "view" }
  | { type: "confirm" }
  | { type: "report_payment" }
  | { type: "verify_payment" }
  | { type: "fulfill" }
  | { type: "cancel" };

type OrderCardProps = {
  order: OrderRow;
  highlighted: boolean;
  canManage: boolean;
  /** Sin DnD (overlay del drag o tablero de solo lectura). */
  dragDisabled?: boolean;
  onAction: (order: OrderRow, action: OrderCardAction) => void;
};

/**
 * Tarjeta del tablero (mockup: superficies en capas, radios generosos).
 * El menú ⋮ es la alternativa accesible/táctil completa al drag — el drag
 * nunca es el único camino a una transición.
 */
function OrderCardBase({ order, highlighted, canManage, dragDisabled, onAction }: OrderCardProps) {
  const reducedMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
    disabled: dragDisabled || !canManage,
  });

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : spring.snappy}
      exit={reducedMotion ? undefined : fade.fast}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-order-id={order.id}
        className={cn(
          "group rounded-2xl border border-border bg-background p-3.5 shadow-none transition-shadow",
          canManage && !dragDisabled && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40",
          highlighted && "ring-2 ring-ring",
        )}
        onClick={() => onAction(order, { type: "view" })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAction(order, { type: "view" });
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-xs font-semibold text-muted-foreground">
            {orderNumberLabel(order.order_number)}
          </p>
          <div className="flex items-center gap-1">
            {order.has_payment_proof ? (
              <Paperclip
                aria-label="Comprobante adjunto"
                className={cn("size-3.5", order.pending_payment ? "text-warning" : "text-muted-foreground")}
              />
            ) : null}
            {order.status === "fulfilled" ? (
              <CheckCircle2 aria-hidden className="size-3.5 text-success" />
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Acciones del pedido ${orderNumberLabel(order.order_number)}`}
                  className="size-6 opacity-60 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <EllipsisVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction(order, { type: "view" })}>
                  <span className="flex items-center gap-2"><Eye className="size-4" /> Ver detalle</span>
                </DropdownMenuItem>
                {canManage && canTransition(order.status, "confirmed") ? (
                  <DropdownMenuItem onClick={() => onAction(order, { type: "confirm" })}>
                    <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Confirmar</span>
                  </DropdownMenuItem>
                ) : null}
                {canManage && canTransition(order.status, "payment_reported") ? (
                  <DropdownMenuItem onClick={() => onAction(order, { type: "report_payment" })}>
                    <span className="flex items-center gap-2"><Receipt className="size-4" /> Registrar pago</span>
                  </DropdownMenuItem>
                ) : null}
                {canManage && order.pending_payment ? (
                  <DropdownMenuItem onClick={() => onAction(order, { type: "verify_payment" })}>
                    <span className="flex items-center gap-2"><Paperclip className="size-4" /> Verificar pago</span>
                  </DropdownMenuItem>
                ) : null}
                {canManage && canTransition(order.status, "fulfilled") ? (
                  <DropdownMenuItem onClick={() => onAction(order, { type: "fulfill" })}>
                    <span className="flex items-center gap-2"><PackageCheck className="size-4" /> Marcar entregado</span>
                  </DropdownMenuItem>
                ) : null}
                {canManage && canTransition(order.status, "cancelled") ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive hover:text-destructive"
                      onClick={() => onAction(order, { type: "cancel" })}
                    >
                      <span className="flex items-center gap-2"><XCircle className="size-4" /> Cancelar pedido</span>
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Avatar alt={order.contact_name} fallback={order.contact_name} size={24} />
          <p className="min-w-0 truncate text-sm font-medium">{order.contact_name}</p>
        </div>

        <p className="mt-2 text-base font-semibold tabular-nums">
          {formatMoney(order.total_cents, order.currency)}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <OrderOriginBadge origin={order.created_by_type} />
          <span className="text-[11px] text-muted-foreground">{relativeTime(order.created_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export const OrderCard = memo(OrderCardBase);
