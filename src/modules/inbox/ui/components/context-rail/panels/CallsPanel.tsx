"use client";

import { CallContactButton, ContactCallsList } from "@/modules/calls/public";
import { firstNameOf } from "@/modules/inbox/domain/inbox-summary";
import type { ContextPanelHeading, ContextPanelProps } from "../registry";

export function useCallsHeading({ conversation }: ContextPanelProps): ContextPanelHeading {
  const name = conversation.contact.full_name || conversation.contact.phone || "el contacto";
  return { title: `Con ${firstNameOf(name)}`, subtitle: "Las últimas llamadas del agente de voz" };
}

/**
 * Últimas llamadas del contacto dentro del inbox (calls F4-D): el operador
 * escucha la grabación y salta al detalle sin salir de la conversación.
 */
export function CallsPanel({ contactId, contextVersion, conversation }: ContextPanelProps) {
  return (
    <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <CallContactButton
        className="self-start rounded-full"
        contact={{
          id: contactId,
          name: conversation.contact.full_name || null,
          phone: conversation.contact.phone || null,
        }}
      />
      <ContactCallsList contactId={contactId} version={contextVersion} />
    </div>
  );
}
