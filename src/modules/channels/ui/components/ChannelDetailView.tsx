"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, PlugZap, Power, RefreshCw, Trash2 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { readChannelActions } from "@/modules/channels/domain/channel-health";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import { useChannelsRealtime } from "@/modules/channels/infrastructure/hooks/use-channels-realtime";
import { useDeleteChannel } from "@/modules/channels/infrastructure/hooks/use-delete-channel";
import {
  disconnectChannel,
  getChannelById,
} from "@/modules/channels/infrastructure/services/channels-service.adapter";
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm";
import { ChannelFormSubmitButton } from "@/modules/channels/ui/forms/ChannelFormSubmitButton";
import { ChannelHealthCard } from "./ChannelHealthCard";
import { ChannelProviderIcon } from "./ChannelProviderIcon";
import { ChannelStatusBadge } from "./ChannelStatusBadge";
import { MetaPinDialog } from "./MetaPinDialog";
import { ReconnectChannelDialog } from "./ReconnectChannelDialog";

/**
 * `/settings/channels/[id]` — la versión completa del detalle, para quien
 * administra. El `ChannelDetailSheet` del workspace se conserva: ahí no
 * queremos sacar al operador de su vista para mirar el estado de un canal.
 *
 * F4 le añade la tarjeta de salud —calidad del número, límite de mensajería,
 * vigencia del acceso de Meta— y la renovación de la conexión. F6 añade la
 * desconexión suave (B10: `POST /channels/:id/disconnect`, reversible, conserva
 * historial) y la reconexión; la Fase 5 de la auditoría, la confirmación del PIN.
 * Qué acciones se ofrecen lo decide `readChannelActions` en `domain/`, no esta
 * vista.
 */
export function ChannelDetailView({ channelId }: { channelId: string }) {
  useChannelsRealtime();

  const router = useRouter();
  const { showAlert, showModal, closeModal } = useAlert();
  const liveChannels = useChannelStore((s) => s.channels);
  const upsertChannel = useChannelStore((s) => s.upsertChannel);
  // Borrar es el MISMO procedimiento que en el panel del workspace; aquí, además, se navega
  const { confirmDelete, deleting } = useDeleteChannel({
    onDeleted: () => router.replace("/settings/channels"),
  });
  const [fetched, setFetched] = useState<ChannelDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [registeringPin, setRegisteringPin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getChannelById(channelId)
      .then((data) => {
        if (!cancelled) setFetched(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, "No se pudo cargar el canal"));
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  // El estado en vivo del store manda sobre el snapshot del fetch: si llega un
  // `channel.status_changed` mientras la página está abierta, se ve.
  const live = liveChannels.find((item) => item.id === channelId);
  const channel = live ?? fetched;
  // La decisión vive en `domain` (F6): son reglas de producto, no de pintado
  const actions = channel === null ? null : readChannelActions(channel);

  /**
   * Desconectar NO es eliminar, y la copia lo dice explícitamente: es lo único
   * que separa un botón reversible de uno que la gente teme pulsar.
   */
  const confirmDisconnect = () => {
    if (!channel) return;
    showModal({
      title: "Desconectar canal",
      description:
        `“${channel.name}” dejará de recibir y enviar mensajes. ` +
        "Conservas el historial de conversaciones y toda la configuración, " +
        "y puedes volver a conectarlo cuando quieras.",
      className: "sm:max-w-md",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "channel-disconnect-cancel" },
        {
          // `outline` y no `destructive`: es reversible, y pintarlo como el
          // borrado sería mentir sobre lo que hace
          label: "Desconectar",
          variant: "outline",
          asClose: false,
          id: "channel-disconnect-confirm",
          onClick: async () => {
            try {
              const updated = await disconnectChannel(channel.id);
              // Al store, no solo al snapshot: la cabecera pinta `live ?? fetched`
              // y `live` gana. Sin esto el POST pasaba y el badge seguía en verde
              // hasta que llegara el evento por WS — o hasta recargar
              upsertChannel(updated);
              setFetched(updated);
              closeModal();
              showAlert({
                tone: "success",
                title: "Canal desconectado",
                open: true,
                autoCloseMs: 3500,
              });
            } catch (err) {
              showAlert({
                tone: "error",
                title: errorMessage(err, "No se pudo desconectar el canal"),
                open: true,
              });
            }
          },
        },
      ],
    });
  };

  if (loadError !== null) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
          {loadError}
        </div>
      </div>
    );
  }

  if (!channel) return <ChannelDetailSkeleton />;

  const provider = channelProvider(channel.kind);
  const faulted = channel.status === "error";

  return (
    <div className="space-y-6">
      <BackLink />

      <header
        className={cn(
          "channel-surface flex flex-wrap items-start gap-4 rounded-lg border border-border bg-background p-4",
          faulted ? "brand-fault" : provider.brand_class,
        )}
      >
        <ChannelProviderIcon iconId={provider.icon_id} className="relative" />
        <div className="relative min-w-0 flex-1 basis-64">
          <h1 className="truncate text-3xl font-semibold tracking-tight">{channel.name}</h1>
          <p className="truncate text-muted-foreground">
            {provider.label}
            {channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}
          </p>
        </div>
        <ChannelStatusBadge status={channel.status} className="relative" />
      </header>

      <section className="space-y-4 rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold">Estado del canal</h2>
        {/* La MISMA tarjeta que el sheet del workspace: si las dos superficies se
            ven distintas, la duplicación que F4 vino a matar volvió */}
        <ChannelHealthCard channel={channel} />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-6">
        <div>
          <h2 className="text-base font-semibold">Nombre y agente</h2>
          <p className="text-xs text-muted-foreground">
            Quien atiende primero los mensajes de este canal.
          </p>
        </div>
        {/* `ChannelForm` no trae botón propio: lo pinta el host con el estado
            de envío a la vista, para que un doble clic no mande dos PATCH */}
        <ChannelForm
          host={{ channel }}
          formId="channel-detail-form"
          renderSubmit={(state) => (
            <ChannelFormSubmitButton {...state}>Guardar cambios</ChannelFormSubmitButton>
          )}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h2 className="text-base font-semibold">Acciones</h2>
          <p className="text-xs text-muted-foreground">{actions?.hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Primero y sólido: es lo único que deja el canal a medias. Sin esta
              acción, el aviso de salud mandaba a «Renovar», que devolvía el
              mismo sub-estado — un bucle sin sitio donde teclear el PIN */}
          {actions?.can_register_pin === true && (
            <Button onClick={() => setRegisteringPin(true)}>
              <KeyRound aria-hidden="true" className="size-4" />
              Confirmar PIN
            </Button>
          )}
          {/* Renovar solo tiene sentido en un canal VIVO: desconectado ofrece
              «Reconectar», que es la misma acción con otro nombre. Antes salían
              los dos botones a la vez sobre el mismo diálogo */}
          {provider.meta_product !== undefined && channel.status !== "disconnected" && (
            <Button
              variant={actions?.can_register_pin === true ? "outline" : "default"}
              onClick={() => setReconnecting(true)}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Renovar conexión
            </Button>
          )}
          {actions?.can_disconnect === true && (
            <Button variant="outline" onClick={confirmDisconnect}>
              <Power aria-hidden="true" className="size-4" />
              Desconectar
            </Button>
          )}
          {actions?.can_reconnect === true && (
            <Button onClick={() => setReconnecting(true)}>
              <PlugZap aria-hidden="true" className="size-4" />
              Reconectar
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            disabled={deleting}
            onClick={() => confirmDelete(channel)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Eliminar canal
          </Button>
        </div>
      </section>

      {/* Los tres productos de Meta se reconectan relanzando su alta por botón:
          antes solo WhatsApp, y un Instagram revocado solo ofrecía «Eliminar» */}
      {provider.meta_product !== undefined && (
        <ReconnectChannelDialog
          channel={channel}
          open={reconnecting}
          onOpenChange={setReconnecting}
        />
      )}
      {actions?.can_register_pin === true && (
        <MetaPinDialog channel={channel} open={registeringPin} onOpenChange={setRegisteringPin} />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" className="-ml-3 w-fit text-muted-foreground">
      <Link href="/settings/channels">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Canales
      </Link>
    </Button>
  );
}

function ChannelDetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando canal" aria-busy="true" className="space-y-6">
      <Skeleton className="h-9 w-28" />
      <div className="flex items-start gap-4 rounded-lg border border-border p-4">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-4 rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando canal…</span>
    </div>
  );
}
