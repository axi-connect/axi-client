"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Info } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { readOnboardingNotice } from "@/modules/channels/domain/channel-health";
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm";
import { ChannelProviderIcon } from "../ChannelProviderIcon";
import { ChannelStatusBadge } from "../ChannelStatusBadge";

/**
 * Paso 4: listo.
 *
 * El nombre y el agente se editan con el `ChannelForm` en modo edición, que es la
 * misma pieza que usa el detalle del canal. El nombre ya viajó en el alta —el
 * backend acepta `name` en el POST—, así que esto es un ajuste, no un requisito.
 *
 * **Cero jerga en la superficie**: los identificadores de Meta viven en el
 * acordeón "Detalles técnicos", que existe para que soporte pueda pedirle al
 * cliente que lo despliegue.
 */
export function ConnectSuccess({ channel: connected }: { channel: ChannelDTO }) {
  // El formulario de abajo renombra y asigna agente: sin este estado, guardar
  // actualizaba el servidor y esta pantalla seguía enseñando el nombre viejo
  const [channel, setChannel] = useState<ChannelDTO>(connected);
  const provider = channelProvider(channel.kind);
  // El copy de los sub-estados pendientes vive en `domain/channel-health`, una
  // sola vez: aquí y en la tarjeta de salud tienen que decir lo mismo
  const notice = readOnboardingNotice(channel.onboarding?.status);

  const submit = () => {
    const form = document.getElementById("channels-form");
    (form as HTMLFormElement | null)?.requestSubmit();
  };

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "channel-surface space-y-5 rounded-lg border border-border bg-background p-4 md:p-6",
          provider.brand_class,
        )}
      >
        <div className="relative flex flex-wrap items-start gap-4">
          <ChannelProviderIcon iconId={provider.icon_id} />
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="text-xl font-semibold tracking-tight">
              {`Tu ${provider.label} ya está conectado`}
            </h2>
            <p className="text-muted-foreground">
              Desde ahora los mensajes que lleguen a{" "}
              <span className="font-medium text-foreground">
                {channel.display_phone_number ?? channel.name}
              </span>{" "}
              aparecen en Conversaciones.
            </p>
          </div>
          <ChannelStatusBadge status={channel.status} />
        </div>

        <hr className="border-border" />

        <ChannelForm host={{ channel, onSuccess: setChannel }} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={submit}>
            Guardar cambios
          </Button>
        </div>

        {notice !== null && (
          <div
            className={cn(
              "flex gap-3 rounded-md border p-4",
              notice.tone === "warning"
                ? "border-warning/40 bg-warning/[0.09]"
                : "border-info/40 bg-info/[0.08]",
            )}
          >
            <Info
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4.5 shrink-0",
                notice.tone === "warning" ? "text-warning" : "text-info",
              )}
            />
            <div className="space-y-1.5">
              <p className="font-semibold">{notice.title}</p>
              <p className="text-muted-foreground">{notice.detail}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 rounded-md border border-success/40 bg-success/[0.09] p-4">
        <Check aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-success" />
        <div className="space-y-1">
          <p className="font-semibold">Pruébalo ahora</p>
          <p className="text-muted-foreground">
            {channel.display_phone_number
              ? "Escríbele a ese número desde otro teléfono: el mensaje aparecerá en Conversaciones en unos segundos."
              : "Mándale un mensaje desde otra cuenta: aparecerá en Conversaciones en unos segundos."}
          </p>
        </div>
      </div>

      <details className="rounded-lg border border-border">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
          Detalles técnicos
        </summary>
        <div className="space-y-2 border-t border-border p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Solo hacen falta si soporte te los pide.
          </p>
          <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
            <TechField label="Identificador del canal" value={channel.id} />
            <TechField label="Phone number ID" value={channel.provider_account_id} />
            <TechField label="WhatsApp Business Account ID" value={channel.waba_id ?? "—"} />
            <TechField label="Business ID" value={channel.business_id ?? "—"} />
            <TechField label="Forma de conexión" value={channel.connection_method} />
            <TechField label="Estado del alta" value={channel.onboarding?.status ?? "—"} />
          </dl>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/workspace/inbox">Ir a Conversaciones</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/channels">Ver mis canales</Link>
        </Button>
      </div>
    </div>
  );
}

function TechField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs break-all">{value}</dd>
    </div>
  );
}
