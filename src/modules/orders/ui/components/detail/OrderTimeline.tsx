import {
  BellOff,
  BellRing,
  CircleCheck,
  CircleX,
  FilePen,
  PackagePlus,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { OrderEventDTO } from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS } from "@/modules/orders/domain/order-state";
import type { OrderStatus } from "@/modules/orders/domain/order";

/** Timeline vertical del pedido (sección ACTIVIDAD del detalle). */
type EventVisual = { icon: React.ReactNode; label: string; tone?: "success" | "destructive" | "warning" };

function actorName(event: OrderEventDTO): string {
  if (event.actor_type === "ai_agent") return "el agente IA";
  if (event.actor_type === "system") return "el sistema";
  return event.actor_name ?? "un operador";
}

function payloadOf(event: OrderEventDTO): Record<string, unknown> {
  return typeof event.payload === "object" && event.payload !== null
    ? (event.payload as Record<string, unknown>)
    : {};
}

function visualFor(event: OrderEventDTO): EventVisual {
  const payload = payloadOf(event);
  switch (event.type) {
    case "created":
      return { icon: <PackagePlus className="size-3.5" />, label: `Creado por ${actorName(event)}` };
    case "status_changed": {
      const to = payload.to as OrderStatus | undefined;
      const label =
        to !== undefined
          ? `${ORDER_STATUS_LABELS[to]} por ${actorName(event)}`
          : `Cambio de estado por ${actorName(event)}`;
      return {
        icon: to === "cancelled" ? <CircleX className="size-3.5" /> : <RefreshCw className="size-3.5" />,
        label,
        tone: to === "cancelled" ? "destructive" : undefined,
      };
    }
    case "payment_reported":
      return {
        icon: <Receipt className="size-3.5" />,
        label: `Pago reportado por ${actorName(event)}`,
        tone: "warning",
      };
    case "payment_verified":
      return {
        icon: <CircleCheck className="size-3.5" />,
        label: `Pago verificado por ${actorName(event)}`,
        tone: "success",
      };
    case "payment_rejected":
      return {
        icon: <CircleX className="size-3.5" />,
        label: `Pago rechazado por ${actorName(event)}`,
        tone: "destructive",
      };
    case "updated":
      return { icon: <FilePen className="size-3.5" />, label: `Editado por ${actorName(event)}` };
    case "customer_notified":
      return { icon: <BellRing className="size-3.5" />, label: "Cliente avisado por WhatsApp", tone: "success" };
    case "customer_notification_skipped": {
      const reason = payload.reason;
      const detail =
        reason === "channels/outside_service_window"
          ? "fuera de la ventana de 24 h"
          : reason === "channels/not_connected"
            ? "canal desconectado"
            : "sin canal disponible";
      return {
        icon: <BellOff className="size-3.5" />,
        label: `Aviso al cliente omitido (${detail})`,
        tone: "warning",
      };
    }
    default:
      return { icon: <RefreshCw className="size-3.5" />, label: event.type };
  }
}

const TONE_CLASSES = {
  success: "bg-success/12 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
} as const;

export function OrderTimeline({ events }: { events: OrderEventDTO[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin actividad registrada.</p>;
  }
  // Más reciente primero (el backend devuelve asc)
  const ordered = [...events].reverse();
  return (
    <ol className="space-y-0">
      {ordered.map((event, index) => {
        const visual = visualFor(event);
        const payload = payloadOf(event);
        const note = typeof payload.notes === "string" && payload.notes.length > 0 ? payload.notes : null;
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < ordered.length - 1 ? (
              <span aria-hidden className="absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-px bg-border" />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                visual.tone !== undefined ? TONE_CLASSES[visual.tone] : "bg-secondary text-muted-foreground",
              )}
            >
              {visual.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm">{visual.label}</p>
              {note !== null ? <p className="text-xs text-muted-foreground">«{note}»</p> : null}
              <p className="text-[11px] text-muted-foreground">
                {new Date(event.created_at).toLocaleString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
