"use client";

import { ContactTimelineFeed } from "@/modules/crm/public";
import { firstNameOf } from "@/modules/inbox/domain/inbox-summary";
import type { ContextPanelHeading, ContextPanelProps } from "../registry";

export function useHistoryHeading({ conversation }: ContextPanelProps): ContextPanelHeading {
  const name = conversation.contact.full_name || conversation.contact.phone || "el contacto";
  return { title: `Todo con ${firstNameOf(name)}`, subtitle: "La misma línea de tiempo de la ficha 360" };
}

/**
 * Historial del contacto dentro del inbox: la misma vista 360 que el CRM
 * (actividades, oportunidades, pedidos, conversaciones y citas en un solo hilo),
 * sin salir de la conversación.
 *
 * `contextVersion` lo incrementan los eventos WS del contacto: crear una nota o
 * mover un pedido desde otra vista refresca este panel sin recargar.
 */
export function HistoryPanel({ contactId, contextVersion }: ContextPanelProps) {
  return (
    <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <ContactTimelineFeed contactId={contactId} version={contextVersion} compact />
    </div>
  );
}
