"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
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
  onCreated,
}: {
  prominent?: boolean;
  /** Sin argumento: `ChannelForm.onSuccess` no expone el canal creado y su
   *  lógica no se toca en esta fase. El host recarga la lista. */
  onCreated: () => void;
}) {
  const submit = () => {
    const form = document.getElementById("channels-form");
    (form as HTMLFormElement | null)?.requestSubmit();
  };

  return (
    <details
      open={prominent}
      className={cn(
        "rounded-lg border",
        prominent ? "border-warning/40 bg-warning/[0.06]" : "border-border",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        {prominent
          ? "Conecta pegando tus credenciales de Meta"
          : "Ya tengo mis credenciales de Meta (avanzado)"}
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          {prominent
            ? "Como no pudimos abrir el conector de Meta, esta es la vía que sí va a funcionar. Necesitas los datos de tu app en el portal de desarrolladores."
            : "Solo si ya creaste una app en el portal de desarrolladores de Meta y generaste un token permanente."}
        </p>
        {/* El formulario NO trae botón propio: lo dispara el host con
            requestSubmit(), igual que el modal del listado */}
        <ChannelForm onSuccess={onCreated} />
        <Button variant="outline" onClick={submit}>
          Guardar credenciales
        </Button>
      </div>
    </details>
  );
}
