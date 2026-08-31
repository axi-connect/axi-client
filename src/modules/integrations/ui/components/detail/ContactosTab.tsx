"use client";

import { EmptyState } from "@/shared/components/features/empty-state";

/**
 * Pestaña Contactos (F9): existe en el marco de pestañas porque la capacidad
 * `contacts` la abre (proveedores CRM), pero HOY es informativa — ningún
 * proveedor con contactos está `available`, así que no llama a ninguna API.
 * Cuando Salesforce/HubSpot se conecten de verdad, este panel se sustituye por
 * la lista real sin tocar el marco.
 */
export function ContactosTab() {
  return (
    <EmptyState
      glyph="people"
      title="Todavía no hay contactos sincronizados"
      description="La sincronización de contactos se activa al conectar un CRM. Cuando esté activa, los contactos de esta cuenta y los de axi se mantendrán al día en ambos sentidos."
    />
  );
}
