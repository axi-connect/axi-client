"use client";

import { createContext, useContext } from "react";
import { useContactContext, type ContactContext } from "@/modules/crm/public";

/**
 * Contexto del contacto de la conversación abierta, resuelto UNA vez para todos
 * sus consumidores.
 *
 * La cabecera del chat (etapa, score, etiquetas, responsable) y el panel
 * Contacto del rail necesitan los mismos tres recursos
 * (`/contacts/{id}` + `/profile` + `/tags`). Si cada uno llamara a
 * `useContactContext` por su cuenta serían seis peticiones por conversación
 * abierta, y ambos verían estados de carga distintos.
 *
 * Se monta en `InboxView` (§9 de architecture.md: Context cuando el estado se
 * acota a un subárbol y su ciclo de vida es el de la vista).
 */

const ContactContextValue = createContext<ContactContext | null>(null);

export function ContactContextProvider({
  contactId,
  version,
  children,
}: {
  contactId: string | null;
  /** `contextVersion` del store: los eventos WS del contacto fuerzan recarga. */
  version: number;
  children: React.ReactNode;
}) {
  const value = useContactContext(contactId, version);
  return <ContactContextValue.Provider value={value}>{children}</ContactContextValue.Provider>;
}

export function useConversationContact(): ContactContext {
  const value = useContext(ContactContextValue);
  if (value === null) {
    throw new Error(
      "useConversationContact requiere <ContactContextProvider> (se monta en InboxView)",
    );
  }
  return value;
}
