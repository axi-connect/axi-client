import { cn } from "@/core/lib/utils";
import type { OrderStatus } from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS } from "@/modules/orders/domain/order-state";

/**
 * Pill de estado (mockup: badges rellenos tipo "Completed"/"Pending").
 * Solo tokens semánticos: el coral es acción, nunca estado destructivo.
 */
const STATUS_CLASSES: Record<OrderStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending: "bg-info/12 text-info",
  confirmed: "bg-accent text-primary",
  payment_reported: "bg-warning/15 text-warning",
  paid: "bg-success/12 text-success",
  fulfilled: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
