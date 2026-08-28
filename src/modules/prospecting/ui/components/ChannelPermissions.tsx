"use client";

import { Mail, MessageCircle, UserRound } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  whyChannelBlocked,
  type LegalBasis,
  type OutreachChannel,
} from "../../domain/lead";

const ICONS: Record<OutreachChannel, typeof Mail> = {
  whatsapp: MessageCircle,
  email: Mail,
  manual: UserRound,
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
 */
export function ChannelPermissions({
  lead,
  className,
}: {
  lead: {
    allowed_channels: readonly OutreachChannel[];
    legal_basis: LegalBasis;
  };
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {CHANNEL_ORDER.map((channel) => {
        const Icon = ICONS[channel];
        const blocked = whyChannelBlocked(lead, channel);
        return (
          <Tooltip key={channel}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "relative grid size-6 place-items-center rounded-md border",
                  blocked === null
                    ? "border-success/35 bg-success/10 text-success"
                    : "border-border text-foreground/25",
                )}
                aria-label={`${CHANNEL_LABELS[channel]}: ${blocked === null ? "permitido" : "no permitido"}`}
              >
                <Icon className="size-3" aria-hidden />
                {blocked !== null && (
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
                {blocked ??
                  "Permitido con el permiso que tenemos sobre este dato."}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </span>
  );
}
