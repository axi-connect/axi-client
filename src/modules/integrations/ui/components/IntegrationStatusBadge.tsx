import { cn } from "@/core/lib/utils";
import {
  INTEGRATION_STATUS_LABELS,
  type IntegrationStatus,
} from "@/modules/integrations/domain/integration";

/** Fuente única de color+etiqueta del estado (patrón ChannelStatusBadge). */
const STATUS_DOT: Record<IntegrationStatus, string> = {
  pending_setup: "bg-muted-foreground",
  connected: "bg-success",
  error: "bg-destructive",
  disconnected: "bg-muted-foreground",
};

const STATUS_TEXT: Record<IntegrationStatus, string> = {
  pending_setup: "text-muted-foreground",
  connected: "text-success",
  error: "text-destructive",
  disconnected: "text-muted-foreground",
};

const STATUS_SURFACE: Record<IntegrationStatus, string> = {
  pending_setup: "bg-secondary",
  connected: "bg-success/12",
  error: "bg-destructive/12",
  disconnected: "bg-secondary",
};

export function IntegrationStatusBadge({
  status,
  className,
}: {
  status: IntegrationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_SURFACE[status],
        STATUS_TEXT[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
      {INTEGRATION_STATUS_LABELS[status]}
    </span>
  );
}
