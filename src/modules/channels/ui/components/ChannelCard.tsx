"use client";

import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import {
  readLastCheck,
  readMessagingLimit,
  readMetaAccess,
  readQualityRating,
} from "@/modules/channels/domain/channel-health";
import {
  ProviderCard,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";

import { ChannelProviderIcon } from "./ChannelProviderIcon";
import { ChannelStatusBadge } from "./ChannelStatusBadge";

/**
 * Tarjeta de canal del listado.
 *
 * Un grid de tarjetas y no un `DataTable`: los canales de un tenant son cinco
 * filas como mucho, con estado en vivo, y `GET /channels` no pagina, así que
 * `usePaginatedList` se alimentaría de un contrato que no existe.
 *
 * La superficie premium la pone `ProviderCard`, compartido con integraciones y
 * con las fuentes de captación: estaba copiada literal en cuatro archivos. Un
 * canal en `error` cambia su resplandor al destructivo, así que la tarjeta
 * comunica el problema por color y no solo por el badge.
 */
export function ChannelCard({ channel }: { channel: ChannelDTO }) {
  const provider = channelProvider(channel.kind);
  const faulted = channel.status === "error";

  return (
    <ProviderCard
      href={`/settings/channels/${channel.id}`}
      brand={provider.brand_class.replace("brand-", "") as ProviderBrand}
      faulted={faulted}
      icon={<ChannelProviderIcon iconId={provider.icon_id} bare />}
      title={channel.name}
      subtitle={`${provider.label}${channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}`}
      badge={<ChannelStatusBadge status={channel.status} />}
      /* Las mismas traducciones que la tarjeta de salud, desde `domain/`: ningún
         enum de Meta llega a la pantalla ni aquí ni en el detalle.

         Tres ramas, no dos. La versión anterior mandaba TODO lo que no era
         `whatsapp_cloud` a la métrica de sesión, así que Instagram, Messenger y
         el simulador anunciaban estar «Vinculada al celular» — un concepto que
         solo existe en WhatsApp Web. Un canal que miente sobre cómo está
         conectado es peor que un canal que no dice nada. */
      metrics={[
        ...(channel.kind === "whatsapp_cloud"
          ? [
              {
                label: "Calidad del número",
                value: readQualityRating(channel.quality_rating).label,
              },
              {
                label: "Puedes iniciar",
                value: readMessagingLimit(channel.messaging_limit).label,
              },
            ]
          : channel.kind === "whatsapp_web"
            ? [
                {
                  label: "Sesión",
                  value:
                    channel.status === "connected" ? "Vinculada al celular" : "Sin vincular",
                },
              ]
            : []),
        {
          label: faulted ? "Última comprobación" : "Acceso de Meta",
          value: faulted
            ? readLastCheck(channel.last_health_check_at)
            : readMetaAccess(channel).label,
        },
      ]}
    />
  );
}
