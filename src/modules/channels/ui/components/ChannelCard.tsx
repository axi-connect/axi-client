"use client";

import Link from "next/link";

import { cn } from "@/core/lib/utils";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { ChannelProviderIcon } from "./ChannelProviderIcon";
import { ChannelStatusBadge } from "./ChannelStatusBadge";

/**
 * Tarjeta de canal del listado.
 *
 * Un grid de tarjetas y no un `DataTable`: los canales de un tenant son cinco
 * filas como mucho, con estado en vivo, y `GET /channels` no pagina, así que
 * `usePaginatedList` se alimentaría de un contrato que no existe.
 *
 * La superficie (`channel-surface` + `brand-*`) trae el resplandor del
 * proveedor y el cometa del borde aprobados en F0. Un canal en `error` cambia
 * su `--ch-glow` al destructivo: la tarjeta comunica el problema por color y no
 * solo por el badge.
 */
export function ChannelCard({ channel }: { channel: ChannelDTO }) {
  const provider = channelProvider(channel.kind);
  const faulted = channel.status === "error";

  return (
    <Link
      href={`/settings/channels/${channel.id}`}
      className={cn(
        "channel-surface flex w-full flex-col gap-3.5 rounded-lg border border-border bg-background p-4",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        faulted ? "brand-fault" : provider.brand_class,
      )}
    >
      <div className="relative flex items-start gap-3">
        <ChannelProviderIcon iconId={provider.icon_id} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">{channel.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {provider.label}
            {channel.display_phone_number ? ` · ${channel.display_phone_number}` : ""}
          </span>
        </span>
        <ChannelStatusBadge status={channel.status} />
      </div>

      <dl className="relative flex flex-wrap gap-x-6 gap-y-1.5">
        <Metric
          label="Nombre verificado"
          value={channel.verified_name ?? "Sin verificar"}
        />
        <Metric
          label="Credenciales"
          value={channel.credentials_configured ? "Configuradas" : "Sin configurar"}
        />
      </dl>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium">{value}</dd>
    </div>
  );
}
