"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import {
  CHANNEL_LABELS,
  LEGAL_BASIS_LABELS,
  type LeadDetailDTO,
} from "../../domain/lead";

interface Requirement {
  met: boolean;
  title: string;
  detail: string;
}

/**
 * La puerta, dibujada como puerta — y como la ÚNICA isla de la ficha (§9.5.1):
 * es lo más accionable de la pantalla.
 *
 * Promover no es un botón más: crea un contacto real, es irreversible y a
 * partir de ahí el tenant responde por ese dato ante su titular. Por eso los
 * requisitos se listan ANTES —incluido el que no se cumple— en vez de dejar
 * que el usuario descubra el problema con un error después de pulsar.
 *
 * El requisito en rojo no bloquea: informa. «WhatsApp queda bloqueado» no
 * impide promover a un negocio sacado de un directorio público; impide
 * escribirle primero por ese canal, que es otra cosa y hay que decirlo aquí,
 * cuando la persona todavía puede cambiar de opinión.
 */
export function PromotionGate({
  lead,
  busy,
  onPromote,
}: {
  lead: LeadDetailDTO;
  busy: boolean;
  onPromote: () => void;
}) {
  const identifiable = lead.phone !== null || lead.email !== null;
  const allowsWhatsapp = lead.allowed_channels.includes("whatsapp");

  const requirements: Requirement[] = [
    {
      met: true,
      title: "Base legal declarada",
      detail: LEGAL_BASIS_LABELS[lead.legal_basis],
    },
    {
      met: identifiable,
      title: identifiable ? "Tiene con qué contactarse" : "No tiene teléfono ni correo",
      detail: identifiable
        ? lead.allowed_channels.map((channel) => CHANNEL_LABELS[channel]).join(" · ")
        : "Sin uno de los dos no hay contacto que crear en tu CRM.",
    },
    {
      met: allowsWhatsapp,
      title: allowsWhatsapp ? "Puedes escribirle por WhatsApp" : "WhatsApp queda bloqueado",
      detail: allowsWhatsapp
        ? "Dio permiso, así que tu agente puede iniciar la conversación."
        : "Sin permiso no se puede escribir primero por WhatsApp: Meta suspende el número. Podrás usar correo y llamada.",
    },
  ];

  return (
    <InkIsland label="Promover al CRM" glow="ai" className="gap-3">
      <Kicker>Promover al CRM</Kicker>
      <p className="text-sm text-pretty">
        Al promoverlo se crea un contacto real. Es la única forma de que tu agente o una campaña puedan alcanzarlo.
      </p>
      <ul className="divide-border divide-y">
        {requirements.map((requirement) => (
          <li key={requirement.title} className="flex items-start gap-3 py-3 text-sm">
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full",
                requirement.met ? "bg-foreground text-background" : "bg-destructive/15 text-destructive",
              )}
            >
              {requirement.met ? <Check className="size-3.5" strokeWidth={2.6} /> : <X className="size-3.5" strokeWidth={2.6} />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{requirement.title}</span>
              <span className="text-muted-foreground text-pretty">{requirement.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-start gap-2 pt-1">
        <Button variant="contrast" className="h-11 rounded-full px-5" disabled={busy || !identifiable} onClick={onPromote}>
          Promover al CRM
        </Button>
        <span className="text-muted-foreground text-xs">Quedará con origen «Captación».</span>
      </div>
    </InkIsland>
  );
}
