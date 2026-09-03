"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store";
import { useChannelsRealtime } from "@/modules/channels/infrastructure/hooks/use-channels-realtime";
import { ChannelCard } from "./ChannelCard";
import { ChannelsEmptyState } from "./ChannelsEmptyState";

/**
 * `/settings/channels` — la página de canales del tenant.
 *
 * Antes de F1 las únicas rutas de canales eran dos *intercepting routes* del
 * workspace sin página subyacente, así que recargar `/workspace/channels/create`
 * daba 404. Esta vista es la URL canónica: conectar un canal es una tarea de
 * administración que se hace una vez, no trabajo de inbox (D4 del plan).
 *
 * El alta vive en `/settings/channels/connect` desde F3. El `ChannelForm` que F1
 * montaba aquí en un modal se replegó a "Opciones avanzadas" del paso 3 del
 * wizard, que es su sitio: es el escape hatch de soporte, no el camino normal.
 */
export function ChannelsView() {
  // Montado también aquí, no solo en el layout del workspace: sin esto los
  // estados de esta página quedarían congelados en el snapshot del fetch. El
  // socket lleva contador de referencias, así que un segundo consumidor no abre
  // una segunda conexión.
  useChannelsRealtime();

  const channels = useChannelStore((s) => s.channels);
  const loading = useChannelStore((s) => s.loading);
  const error = useChannelStore((s) => s.error);
  const fetchChannels = useChannelStore((s) => s.fetchChannels);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  const faulted = channels.filter((channel) => channel.status === "error");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 basis-80">
          <h1 className="text-3xl font-semibold tracking-tight">Canales</h1>
          <p className="text-muted-foreground">{subtitle(channels.length, faulted.length)}</p>
        </div>
        {channels.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void fetchChannels()}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Actualizar
            </Button>
            <Button asChild>
              <Link href="/settings/channels/connect">
                <Plus aria-hidden="true" className="size-4" />
                Conectar canal
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* El canal caído va primero: es el único que pide una acción */}
      {faulted.map((channel) => (
        <div
          key={channel.id}
          className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/[0.08] p-4"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-destructive" />
          <div className="min-w-0 space-y-1.5">
            <p className="font-semibold">{channel.name} dejó de enviar mensajes</p>
            <p className="text-muted-foreground">
              Meta retiró el acceso de este canal, probablemente porque alguien lo revocó desde el
              Administrador comercial. Los mensajes que te escriben siguen llegando; no puedes
              responder hasta reconectarlo.
            </p>
            <Button asChild variant="outline" size="sm" className="bg-background">
              <Link href={`/settings/channels/${channel.id}`}>Ver detalles</Link>
            </Button>
          </div>
        </div>
      ))}

      {/* Un fallo al REFRESCAR no puede borrar los canales que ya se ven: el
          store conserva la lista y aquí el error baja a un aviso. La caja a fondo
          completo queda para la primera carga, cuando no hay nada que mostrar */}
      {error !== null && channels.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning/[0.09] p-3.5"
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-sm">
            No se pudo actualizar la lista; esto es lo último que teníamos. {error}
          </p>
          <Button variant="outline" size="sm" onClick={() => void fetchChannels()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
        </div>
      )}

      {loading && channels.length === 0 ? (
        <ChannelsGridSkeleton />
      ) : error !== null && channels.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => void fetchChannels()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : channels.length === 0 ? (
        <ChannelsEmptyState />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        También puedes conectar Instagram y Messenger. Escríbenos si necesitas varios números en un
        mismo canal.
      </p>

    </div>
  );
}

function subtitle(total: number, faulted: number): string {
  if (total === 0) {
    return "Conecta WhatsApp, Instagram o Messenger para atender a tus clientes desde Axi.";
  }
  const canales = total === 1 ? "1 canal" : `${total} canales`;
  return faulted > 0
    ? `Tienes ${canales}. ${faulted === 1 ? "Uno necesita" : `${faulted} necesitan`} tu atención.`
    : `Tienes ${canales} conectados y funcionando.`;
}

/** Anchos deterministas: `Math.random()` rompe la hidratación (§9.1). */
function ChannelsGridSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando canales"
      aria-busy="true"
      className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]"
    >
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-3.5 rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando canales…</span>
    </div>
  );
}
