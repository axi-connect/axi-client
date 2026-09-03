"use client";

import { ChevronRight } from "lucide-react";

import type { ManualChannelKind } from "@/modules/channels/domain/channel-providers";
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm";
import { ChannelFormSubmitButton } from "@/modules/channels/ui/forms/ChannelFormSubmitButton";

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
  kind?: ManualChannelKind;
  /** Sin argumento: `ChannelForm.onSuccess` no expone el canal creado y su
   *  lógica no se toca en esta fase. El host recarga la lista. */
  onCreated: () => void;
}) {
  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {prominent
          ? "Necesitas el identificador de la cuenta y un token permanente de tu app en el portal de desarrolladores de Meta."
          : "Solo si ya creaste una app en el portal de desarrolladores de Meta y generaste un token permanente."}
      </p>
      {/* El formulario NO trae botón propio: lo pinta el host con el estado
          de envío a la vista. Id propio: el éxito del wizard puede convivir */}
      <ChannelForm
        fixedKind={kind}
        onSuccess={onCreated}
        formId="manual-credentials-form"
        renderSubmit={(state) => (
          <ChannelFormSubmitButton {...state}>Guardar credenciales</ChannelFormSubmitButton>
        )}
      />
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
