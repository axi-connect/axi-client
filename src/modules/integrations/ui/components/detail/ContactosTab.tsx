"use client";

import { Users } from "lucide-react";

/**
 * Pestaña Contactos (F9): existe en el marco de pestañas porque la capacidad
 * `contacts` la abre (proveedores CRM), pero HOY es informativa — ningún
 * proveedor con contactos está `available`, así que no llama a ninguna API.
 * Cuando Salesforce/HubSpot se conecten de verdad, este panel se sustituye por
 * la lista real sin tocar el marco.
 */
export function ContactosTab() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-border bg-secondary">
        <Users aria-hidden="true" className="size-5.5 text-muted-foreground" />
      </span>
      <p className="font-semibold">Todavía no hay contactos sincronizados</p>
      <p className="max-w-md text-sm text-muted-foreground">
        La sincronización de contactos se activa al conectar un CRM. Cuando esté activa, los
        contactos de esta cuenta y los de axi se mantendrán al día en ambos sentidos.
      </p>
    </div>
  );
}
