"use client";

import { Mail, MessageCircle, UserRound } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import {
  channelVerdict,
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  type ChannelState,
  type ChannelSubject,
  type OutreachChannel,
} from "../../domain/lead";

const ICONS: Record<OutreachChannel, typeof Mail> = {
  whatsapp: MessageCircle,
  email: Mail,
  manual: UserRound,
};

const STATE_CLASSES: Record<ChannelState, string> = {
  usable: "border-success/35 bg-success/10 text-success",
  // Atenuado pero SIN tachar: se podría, solo falta el dato.
  no_data: "border-dashed border-border text-foreground/40",
  blocked: "border-border text-foreground/25",
};

const STATE_LABELS: Record<ChannelState, string> = {
  usable: "puedes escribirle",
  no_data: "falta el dato",
  blocked: "no permitido",
};

/**
 * Por qué canales se le puede escribir a este lead.
 *
 * Es la mitad más importante de la pantalla, junto al semáforo de calidad, y
 * son DOS cosas distintas a propósito: un lead puede estar perfectamente
 * verificado y aun así tener WhatsApp tachado, porque la calidad del dato y el
 * permiso para usarlo son ejes ortogonales. Si esto se leyera como un solo
 * indicador, alguien acabaría mandando una campaña a datos públicos y Meta le
 * suspendería el número al tenant.
 *
 * Los canales negados se pintan tachados en vez de ocultarse: la ausencia se
 * lee como «todavía no cargó», la tachadura como «no se puede, y por esto».
 *
 * Y son TRES estados, no dos. Verde es «tienes permiso y tienes a dónde
 * escribir»; tachado es «la ley no te deja»; atenuado sin tachar es «podrías,
 * pero no tenemos el dato». Los dos últimos se arreglan de forma distinta —el
 * primero no se arregla y el segundo se enriquece— así que pintarlos igual
 * borraría justo lo accionable.
 */
export function ChannelPermissions({
  lead,
  className,
}: {
  lead: ChannelSubject;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {CHANNEL_ORDER.map((channel) => {
        const Icon = ICONS[channel];
        const { state, reason } = channelVerdict(lead, channel);
        return (
          <Tooltip key={channel}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "relative grid size-6 place-items-center rounded-md border",
                  STATE_CLASSES[state],
                )}
                aria-label={`${CHANNEL_LABELS[channel]}: ${STATE_LABELS[state]}`}
              >
                <Icon className="size-3" aria-hidden />
                {/* La tachadura es SOLO del bloqueo legal. Un canal sin dato no
                    está prohibido, así que tacharlo diría lo que no es. */}
                {state === "blocked" && (
                  <span
                    aria-hidden
                    className="bg-foreground/30 absolute inset-x-[3px] top-1/2 h-px -rotate-[32deg]"
                  />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              <p className="font-medium">{CHANNEL_LABELS[channel]}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {reason ?? "Puedes escribirle por aquí."}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}
