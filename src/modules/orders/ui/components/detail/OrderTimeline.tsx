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
import { Timeline, type TimelineItem, type TimelineTone } from "@/shared/components/features/timeline";
import type { OrderEventDTO } from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS } from "@/modules/orders/domain/order-state";
import type { OrderStatus } from "@/modules/orders/domain/order";

/** Timeline vertical del pedido (sección ACTIVIDAD del detalle). */
type EventVisual = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: TimelineTone;
};

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
      return { icon: PackagePlus, label: `Creado por ${actorName(event)}` };
    case "status_changed": {
      const to = payload.to as OrderStatus | undefined;
      const label =
        to !== undefined
          ? `${ORDER_STATUS_LABELS[to]} por ${actorName(event)}`
          : `Cambio de estado por ${actorName(event)}`;
      return {
        icon: to === "cancelled" ? CircleX : RefreshCw,
        label,
        tone: to === "cancelled" ? "destructive" : undefined,
      };
    }
    case "payment_reported":
      return { icon: Receipt, label: `Pago reportado por ${actorName(event)}`, tone: "warning" };
    case "payment_verified":
      return { icon: CircleCheck, label: `Pago verificado por ${actorName(event)}`, tone: "success" };
    case "payment_rejected":
      return { icon: CircleX, label: `Pago rechazado por ${actorName(event)}`, tone: "destructive" };
    case "updated":
      return { icon: FilePen, label: `Editado por ${actorName(event)}` };
    case "customer_notified":
      return { icon: BellRing, label: "Cliente avisado por WhatsApp", tone: "success" };
    case "customer_notification_skipped": {
      const reason = payload.reason;
      const detail =
        reason === "channels/outside_service_window"
          ? "fuera de la ventana de 24 h"
          : reason === "channels/not_connected"
            ? "canal desconectado"
            : "sin canal disponible";
      return { icon: BellOff, label: `Aviso al cliente omitido (${detail})`, tone: "warning" };
    }
    default:
      return { icon: RefreshCw, label: event.type };
  }
}

export function OrderTimeline({ events }: { events: OrderEventDTO[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin actividad registrada.</p>;
  }

  // Más reciente primero (el backend devuelve asc)
  const items: TimelineItem[] = [...events].reverse().map((event) => {
    const visual = visualFor(event);
    const payload = payloadOf(event);
    const note =
      typeof payload.notes === "string" && payload.notes.length > 0 ? payload.notes : null;
    return {
      id: event.id,
      icon: visual.icon,
      tone: visual.tone,
      title: visual.label,
      description: note !== null ? `«${note}»` : undefined,
      meta: new Date(event.created_at).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

  return <Timeline items={items} />;
}
