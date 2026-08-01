"use client";

import { ContactTimelineFeed } from "@/modules/crm/public";
import type { ContextPanelProps } from "../registry";

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
