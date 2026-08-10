import { cn } from "@/core/lib/utils";
import { CHANNEL_STATUS_LABELS, type ChannelStatus } from "@/modules/channels/domain/channel";

/**
 * Indicador de estado de canal — fuente ÚNICA del color y la etiqueta.
 *
 * Existía duplicado carácter a carácter entre `ChannelDetailSheet` (`STATUS_DOT`)
 * y el `ChannelList` del sidebar (`STATUS_COLORS`), así que un estado nuevo
 * habría que añadirlo en dos sitios y el primero en olvidarse se pintaría gris
 * sin avisar. Lo consumen el sidebar del workspace, el sheet y las vistas de
 * `/settings/channels`.
 *
 * `dot` es la variante compacta para el sidebar, donde no cabe la etiqueta y el
 * texto lo aporta el tooltip.
 */
const STATUS_DOT: Record<ChannelStatus, string> = {
  pending_setup: "bg-muted-foreground",
  connecting: "bg-warning animate-pulse",
  connected: "bg-success",
  disconnected: "bg-muted-foreground",
  error: "bg-destructive",
};

const STATUS_TEXT: Record<ChannelStatus, string> = {
  pending_setup: "text-muted-foreground",
  connecting: "text-warning",
  connected: "text-success",
  disconnected: "text-muted-foreground",
  error: "text-destructive",
};

const STATUS_SURFACE: Record<ChannelStatus, string> = {
  pending_setup: "bg-secondary",
  connecting: "bg-warning/12",
  connected: "bg-success/12",
  disconnected: "bg-secondary",
  error: "bg-destructive/12",
};

export function channelStatusDotClass(status: ChannelStatus): string {
  return STATUS_DOT[status];
}

export function ChannelStatusBadge({
  status,
  className,
}: {
  status: ChannelStatus;
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
      {CHANNEL_STATUS_LABELS[status]}
    </span>
  );
}
