"use client";

import { useState } from "react";
import { ChevronRight, Info, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import { updateChannelCredentials } from "@/modules/channels/infrastructure/services/channels-service.adapter";
import { EmbeddedSignupButton } from "./connect/EmbeddedSignupButton";
import { PageSignupButton } from "./connect/PageSignupButton";

/**
 * Renovar la conexión de un canal que ya existe.
 *
 * **No es un formulario de token**: relanza el mismo Embedded Signup. Es el
 * dividendo del diseño idempotente del backend, que detecta el canal existente
 * por `phone_number_id`, rota la credencial y vuelve a suscribir la app — sin
 * endpoint nuevo y sin crear un canal duplicado.
 *
 * De ahí sale el aviso más importante del diálogo: **hay que elegir el mismo
 * número** dentro del popup. Si el usuario elige otro, el backend hará lo
 * correcto —crear un canal nuevo— y aquí se dice en claro, en vez de dejar al
 * tenant con dos canales y sin entender por qué.
 *
 * El camino alternativo de la reconexión **no es crear un canal**, es rotar el
 * token a mano. Eso da por fin un consumidor a `updateChannelCredentials`, que
 * llevaba muerto en el adapter desde que se escribió.
 */
export function ReconnectChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: ChannelDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const provider = channelProvider(channel.kind);
  const { showAlert } = useAlert();
  const upsertChannel = useChannelStore((s) => s.upsertChannel);
  // Instagram y Messenger hablan de «página» o «cuenta», no de número
  const isPage = provider.meta_product === "instagram" || provider.meta_product === "messenger";
  const assetWord = provider.meta_product === "instagram" ? "la misma cuenta" : "la misma página";

  const onConnected = (updated: ChannelDTO) => {
    upsertChannel(updated);
    onOpenChange(false);
    showAlert({
      tone: updated.id === channel.id ? "success" : "info",
      title:
        updated.id === channel.id
          ? "Conexión renovada"
          : isPage
            ? "Conectaste otra página, así que creamos un canal nuevo"
            : "Conectaste un número distinto, así que creamos un canal nuevo",
      open: true,
      autoCloseMs: 5000,
    });
  };

  const intro = (
    <div className="flex gap-3 rounded-md border border-warning/40 bg-warning/[0.09] p-3.5">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          Elige {isPage ? assetWord : "el mismo número"}:{" "}
          {channel.display_phone_number ?? channel.verified_name ?? channel.name}
        </p>
        <p className="text-sm text-muted-foreground">
          Si eliges {isPage ? "otra" : "otro"}, se creará un canal nuevo en lugar de renovar este.
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: "Renovar la conexión",
        description: `Vas a autorizar de nuevo en Meta para “${channel.name}”. No pierdes historial ni configuración.`,
        className: "sm:max-w-2xl",
      }}
    >
      {isPage ? (
        // El de páginas no admite `fallback`: su camino manual es el alta por
        // credenciales, que aquí no aplica. La rotación del page token va aparte.
        <>
          <PageSignupButton provider={provider} intro={intro} onConnected={onConnected} />
          <RotateTokenFallback channelId={channel.id} />
        </>
      ) : (
        <EmbeddedSignupButton
          provider={provider}
          channelName={channel.name}
          intro={intro}
          fallback={<RotateTokenFallback channelId={channel.id} />}
          onConnected={onConnected}
        />
      )}
    </Modal>
  );
}

/**
 * Rotación manual del token: la vía de escape cuando el conector de Meta no
 * carga. `PUT /channels/:id/credentials` conserva el canal y su historial.
 */
function RotateTokenFallback({ channelId }: { channelId: string }) {
  const { showAlert } = useAlert();
  const upsertChannel = useChannelStore((s) => s.upsertChannel);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const rotate = async () => {
    if (token.trim() === "" || saving) return;
    setSaving(true);
    try {
      const updated = await updateChannelCredentials(channelId, token.trim());
      upsertChannel(updated);
      setToken("");
      showAlert({ tone: "success", title: "Credenciales reemplazadas", open: true, autoCloseMs: 3500 });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudieron reemplazar las credenciales"),
        open: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        Ya tengo un token nuevo de Meta (avanzado)
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        <div className="flex gap-3 rounded-md border border-info/40 bg-info/[0.08] p-3.5">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          <p className="text-sm text-muted-foreground">
            Solo si generaste un token permanente en el portal de desarrolladores de Meta. El canal
            y su historial se conservan.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rotate-token" className="text-sm font-medium">
            Token nuevo
          </label>
          <Input
            id="rotate-token"
            type="password"
            autoComplete="off"
            value={token}
            placeholder="••••••••••••"
            onChange={(event) => setToken(event.target.value)}
          />
        </div>
        <Button variant="outline" disabled={token.trim() === "" || saving} onClick={() => void rotate()}>
          Reemplazar credenciales
        </Button>
      </div>
    </details>
  );
}
