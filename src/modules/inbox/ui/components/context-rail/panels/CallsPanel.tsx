"use client";

import { ContactCallsList } from "@/modules/calls/public";
import type { ContextPanelProps } from "../registry";

/**
 * Últimas llamadas del contacto dentro del inbox (calls F4-D): el operador
 * escucha la grabación y salta al detalle sin salir de la conversación.
 */
export function CallsPanel({ contactId, contextVersion }: ContextPanelProps) {
  return (
    <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <ContactCallsList contactId={contactId} version={contextVersion} />
    </div>
  );
}
