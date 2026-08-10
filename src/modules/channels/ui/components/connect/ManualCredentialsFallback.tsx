"use client";

import { ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm";

/**
 * Camino manual: el `ChannelForm` de siempre, **sin tocar su lógica**.
 *
 * Vive colapsado al pie del paso 3 para no competir con el botón, pero **sube a
 * aviso visible cuando el conector de Meta no está disponible**. Si la red
 * corporativa bloquea `connect.facebook.net`, esconder el único camino que
 * funciona detrás de un acordeón deja al cliente sin salida.
 *
 * `prominent` no cambia lo que hace: cambia si se anuncia o se esconde.
 */
export function ManualCredentialsFallback({
  prominent = false,
  kind,
  onCreated,
}: {
  prominent?: boolean;
  /** Fija el proveedor: el wizard ya lo eligió en el paso 1 (F5). */
  kind?: "whatsapp_cloud" | "instagram_dm" | "facebook_messenger";
  /** Sin argumento: `ChannelForm.onSuccess` no expone el canal creado y su
   *  lógica no se toca en esta fase. El host recarga la lista. */
  onCreated: () => void;
}) {
  const submit = () => {
    const form = document.getElementById("channels-form");
    (form as HTMLFormElement | null)?.requestSubmit();
  };

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {prominent
          ? "Necesitas el identificador de la cuenta y un token permanente de tu app en el portal de desarrolladores de Meta."
          : "Solo si ya creaste una app en el portal de desarrolladores de Meta y generaste un token permanente."}
      </p>
      {/* El formulario NO trae botón propio: lo dispara el host con
          requestSubmit(), igual que el modal del listado */}
      <ChannelForm fixedKind={kind} onSuccess={onCreated} />
      <Button variant="outline" onClick={submit}>
        Guardar credenciales
      </Button>
    </div>
  );

  // Cuando es el camino principal se pinta como panel, no como acordeón: dejar
  // que el usuario colapse lo único que hay en la pantalla no es una opción útil.
  if (prominent) {
    return (
      <section className="space-y-4 rounded-lg border border-border p-4 md:p-6">
        <h2 className="text-base font-semibold">Credenciales de Meta</h2>
        {body}
      </section>
    );
  }

  return (
    <details className="rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        Ya tengo mis credenciales de Meta (avanzado)
      </summary>
      <div className="border-t border-border p-4">{body}</div>
    </details>
  );
}
