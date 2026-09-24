import {
  BellOff,
  BellRing,
  CircleCheck,
  CircleX,
  FilePen,
  HandCoins,
  Lock,
  PackagePlus,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { Timeline, type TimelineItem, type TimelineTone } from "@/shared/components/features/timeline";
import type { OrderEventDTO } from "@/modules/orders/domain/order";
import { ORDER_STATUS_LABELS } from "@/modules/orders/domain/order-state";
import type { OrderStatus } from "@/modules/orders/domain/order";

/** Timeline vertical del pedido (sección ACTIVIDAD del detalle). */
type EventVisual = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: TimelineTone;
  /** Una segunda línea que acompaña a la nota del operador, si la hay. */
  detail?: string;
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

function visualFor(event: OrderEventDTO, currency: string): EventVisual {
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
    case "payment_state_changed": {
      // F3 Cobros: el dinero se movió sin que el pedido cambiara de estado.
      const to = typeof payload.to === "string" ? payload.to : null;
      return {
        icon: HandCoins,
        label:
          to === "paid"
            ? "El pedido quedó cobrado"
            : to === "partially_paid"
              ? "El pedido pasó a abonado"
              : "Cambió el estado de cobro",
        tone: to === "paid" ? "success" : undefined,
      };
    }
    case "currency_frozen":
      // F3 Cobros: a partir de aquí la tasa del día ya no mueve el total.
      return { icon: Lock, label: "Total fijado en la moneda de cobro" };
    case "payment_verified": {
      // F3 Cobros (cerrado en F9): en pagos parciales, CUÁNTO se verificó es la
      // mitad del hecho; y si el operador corrigió lo que el cliente reportó,
      // el rastro de esa corrección solo vive aquí (`reported_amount_cents`).
      const amount = typeof payload.amount_cents === "number" ? payload.amount_cents : null;
      const reported =
        typeof payload.reported_amount_cents === "number" ? payload.reported_amount_cents : null;
      // El cliente pudo reportar en OTRA moneda (US$ 500 en un pedido que el
      // verify congeló a COP): el payload la trae; los eventos viejos, no.
      const reportedCurrency =
        typeof payload.reported_currency === "string" ? payload.reported_currency : currency;
      const label =
        amount === null
          ? `Pago verificado por ${actorName(event)}`
          : `${formatMoney(amount, currency)} verificados por ${actorName(event)}`;
      return {
        icon: CircleCheck,
        label,
        tone: "success",
        detail:
          reported !== null && reported !== amount
            ? `El cliente había reportado ${formatMoney(reported, reportedCurrency)}.`
            : undefined,
      };
    }
    case "payment_rejected":
      return { icon: CircleX, label: `Pago rechazado por ${actorName(event)}`, tone: "destructive" };
    case "updated":
      return updatedVisual(payload, actorName(event));
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

export function OrderTimeline({
  events,
  currency = "COP",
}: {
  events: OrderEventDTO[];
  /** La moneda de cobro del pedido: en ella se escriben los montos verificados. */
  currency?: string;
}) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin actividad registrada.</p>;
  }

  // Más reciente primero (el backend devuelve asc)
  const items: TimelineItem[] = [...events].reverse().map((event) => {
    const visual = visualFor(event, currency);
    const payload = payloadOf(event);
    const note =
      typeof payload.notes === "string" && payload.notes.length > 0 ? payload.notes : null;
    const description = [visual.detail, note !== null ? `«${note}»` : null]
      .filter((part): part is string => part !== null && part !== undefined)
      .join(" ");
    return {
      id: event.id,
      icon: visual.icon,
      tone: visual.tone,
      title: visual.label,
      description: description !== "" ? description : undefined,
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

/**
 * `updated` lleva un discriminador `kind` (plan envíos+promos): entrega
 * definida, cotización externa, totales conciliados con el proveedor, código
 * añadido o dirección anonimizada. Sin `kind`, es la edición de siempre.
 */
function updatedVisual(payload: Record<string, unknown>, actor: string): EventVisual {
  switch (payload.kind) {
    case "delivery_set":
      return { icon: FilePen, label: "Entrega definida en el pedido" };
    case "external_quote":
      return payload.degraded === true
        ? {
            icon: FilePen,
            label: "Cotización con la tienda no disponible: se conservó el estimado",
            tone: "warning",
          }
        : { icon: CircleCheck, label: "Total cotizado con la tienda", tone: "success" };
    case "totals_reconciled":
      return payload.aligned === false
        ? { icon: FilePen, label: "El total cobrado por la tienda difiere del local", tone: "warning" }
        : {
            icon: CircleCheck,
            label:
              payload.stage === "paid"
                ? "Pagado en la tienda · totales conciliados"
                : "Totales conciliados con el draft de la tienda",
            tone: "success",
          };
    case "promo_code_attached":
      return {
        icon: FilePen,
        label: typeof payload.code === "string" ? `Código ${payload.code} añadido al pedido` : "Código añadido al pedido",
      };
    case "address_redacted":
      return { icon: FilePen, label: "Dirección de entrega anonimizada (solicitud de privacidad)" };
    default:
      return { icon: FilePen, label: `Editado por ${actor}` };
  }
}
