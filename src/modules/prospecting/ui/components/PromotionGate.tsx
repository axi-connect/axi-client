"use client";

import { Check, ShieldCheck, X } from "lucide-react";

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
 * La puerta, dibujada como puerta.
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
      title: identifiable
        ? "Tiene con qué contactarse"
        : "No tiene teléfono ni correo",
      detail: identifiable
        ? lead.allowed_channels
            .map((channel) => CHANNEL_LABELS[channel])
            .join(" · ")
        : "Sin uno de los dos no hay contacto que crear en tu CRM.",
    },
    {
      met: allowsWhatsapp,
      title: allowsWhatsapp
        ? "Puedes escribirle por WhatsApp"
        : "WhatsApp queda bloqueado",
      detail: allowsWhatsapp
        ? "Dio permiso, así que tu agente puede iniciar la conversación."
        : "Sin permiso no se puede escribir primero por WhatsApp: Meta suspende el número. Podrás usar correo y llamada.",
    },
  ];

  return (
    <section className="border-primary/30 bg-background overflow-hidden rounded-lg border">
      <header className="bg-accent px-4 py-3">
        <h2 className="font-heading text-sm font-bold">Promover al CRM</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Al promoverlo se crea un contacto real. Es la única forma de que tu
          agente o una campaña puedan alcanzarlo.
        </p>
      </header>

      <ul className="flex flex-col gap-2.5 px-4 py-3">
        {requirements.map((requirement) => (
          <li
            key={requirement.title}
            className="flex items-start gap-2.5 text-sm"
          >
            <span
              className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${
                requirement.met
                  ? "bg-success/15 text-success"
                  : "bg-destructive/12 text-destructive"
              }`}
              aria-hidden
            >
              {requirement.met ? (
                <Check className="size-2.5" />
              ) : (
                <X className="size-2.5" />
              )}
            </span>
            <span>
              {requirement.title}
              <small className="text-muted-foreground block text-xs">
                {requirement.detail}
              </small>
            </span>
          </li>
        ))}
      </ul>

      <footer className="border-border flex items-center gap-2 border-t px-4 py-3">
        <Button disabled={busy || !identifiable} onClick={onPromote}>
          <ShieldCheck className="size-4" aria-hidden />
          Promover al CRM
        </Button>
        <span className="text-muted-foreground text-xs">
          Quedará con origen «Captación».
        </span>
      </footer>
    </section>
  );
}
