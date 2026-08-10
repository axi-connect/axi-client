"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import { useChannelsRealtime } from "@/modules/channels/infrastructure/hooks/use-channels-realtime";
import {
  deleteChannel,
  getChannelById,
} from "@/modules/channels/infrastructure/services/channels-service.adapter";
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm";
import { ChannelProviderIcon } from "./ChannelProviderIcon";
import { ChannelStatusBadge } from "./ChannelStatusBadge";
import { WwebSessionActions } from "./WwebSessionActions";

/**
 * `/settings/channels/[id]` — la versión completa del detalle, para quien
 * administra. El `ChannelDetailSheet` del workspace se conserva: ahí no
 * queremos sacar al operador de su vista para mirar el estado de un canal.
 *
 * F1 muestra lo mismo que el sheet: identidad, credenciales y sesión de
 * WhatsApp Web. La tarjeta de salud (calidad del número, límite de mensajería,
 * vigencia del acceso de Meta) llega en F4, cuando haya qué pintar en ella.
 */
export function ChannelDetailView({ channelId }: { channelId: string }) {
  useChannelsRealtime();

  const router = useRouter();
  const { showAlert, showModal, closeModal } = useAlert();
  const liveChannels = useChannelStore((s) => s.channels);
  const pairingByChannel = useChannelStore((s) => s.pairingByChannel);
  const removeChannel = useChannelStore((s) => s.removeChannel);
  const [fetched, setFetched] = useState<ChannelDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const pairing = pairingByChannel[channelId];

  const confirmDelete = () => {
    if (!channel) return;
    showModal({
      title: "Eliminar canal",
      description: `¿Seguro que deseas eliminar “${channel.name}”? Este número deja de recibir mensajes en Axi y las conversaciones quedan archivadas.`,
      className: "sm:max-w-md",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "channel-delete-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "channel-delete-confirm",
          onClick: async () => {
            try {
              await deleteChannel(channel.id);
              removeChannel(channel.id);
              closeModal();
              showAlert({ tone: "success", title: "Canal eliminado", open: true, autoCloseMs: 3500 });
              router.replace("/settings/channels");
            } catch (err) {
              showAlert({
                tone: "error",
                title: errorMessage(err, "No se pudo eliminar el canal"),
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
        <h2 className="text-base font-semibold">Datos del canal</h2>
        <dl className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]">
          <Field label="Tipo" value={provider.label} />
          <Field label="Teléfono" value={channel.display_phone_number ?? "—"} />
          <Field label="Nombre verificado" value={channel.verified_name ?? "—"} />
          <Field
            label="Credenciales"
            value={
              channel.credentials_configured
                ? `Configuradas${channel.token_last4 ? ` (…${channel.token_last4})` : ""}`
                : "Sin configurar"
            }
          />
        </dl>
      </section>

      {channel.kind === "whatsapp_web" && (
        <section className="space-y-4 rounded-lg border border-border p-6">
          <div>
            <h2 className="text-base font-semibold">Sesión del dispositivo</h2>
            <p className="text-xs text-muted-foreground">
              La vinculación depende de que el celular siga encendido y con internet.
            </p>
          </div>
          <WwebSessionActions channel={channel} pairing={pairing} />
        </section>
      )}

      <section className="space-y-4 rounded-lg border border-border p-6">
        <div>
          <h2 className="text-base font-semibold">Nombre y agente</h2>
          <p className="text-xs text-muted-foreground">
            Quien atiende primero los mensajes de este canal.
          </p>
        </div>
        <ChannelForm host={{ channel }} />
        {/* `ChannelForm` no trae botón propio: lo dispara el host con
            requestSubmit(), igual que hace el modal del listado con su footer */}
        <Button
          variant="outline"
          onClick={() => {
            const form = document.getElementById("channels-form");
            (form as HTMLFormElement | null)?.requestSubmit();
          }}
        >
          Guardar cambios
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h2 className="text-base font-semibold">Eliminar canal</h2>
          <p className="text-xs text-muted-foreground">
            Al eliminarlo, este número deja de recibir mensajes en Axi y las conversaciones quedan
            archivadas.
          </p>
        </div>
        <Button variant="outline" className="text-destructive" onClick={confirmDelete}>
          <Trash2 aria-hidden="true" className="size-4" />
          Eliminar canal
        </Button>
      </section>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
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
