"use client";

import Link from "next/link";
import { ExternalLink, Sparkles, UserRound } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Avatar } from "@/shared/components/ui/avatar";
import { StatePill } from "@/shared/components/features/bento";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_TONE,
  ContactDataPanel,
  ContactFieldList,
  ScorePanel,
  contactDisplayName,
} from "@/modules/crm/public";
import { useConversationContact } from "@/modules/inbox/infrastructure/stores/contact-context.context";
import type { ContextPanelHeading, ContextPanelProps } from "../registry";

/** Cabecera: el nombre del contacto y desde cuándo está (la etapa va en el cuerpo). */
export function useContactHeading({ conversation }: ContextPanelProps): ContextPanelHeading {
  const { contact } = useConversationContact();
  const fallback = conversation.contact.full_name || conversation.contact.phone || "Contacto";
  return {
    title: contact !== null ? contactDisplayName(contact) : fallback,
    subtitle:
      contact !== null ? `En contactos desde el ${formatShortDate(contact.created_at)} · ${conversation.channel.name}` : undefined,
  };
}

/**
 * Ficha del contacto de la conversación (F4): la 360 del CRM en pequeño.
 * Identidad y etapa en `StatePill`; «Qué tan cerca está» con la MISMA tesela
 * del CRM F2 (cinco tramos); datos, canales, etiquetas con su color y
 * responsable en solo lectura; debajo, «Datos del cliente» con confirmar y
 * corregir en línea para quien tiene `contacts:manage`. El pie queda fijo.
 */
export function ContactPanel({ conversation }: Pick<ContextPanelProps, "conversation">) {
  // El contexto lo resuelve `InboxView` una sola vez y lo comparte con la
  // cabecera del chat: aquí no se vuelve a pedir nada.
  const { contact, profile, tags, ownerName, loading, error, reload } = useConversationContact();
  const { hasPermission } = useAuth();
  // Programar un seguimiento del agente desde la conversación: el operador
  // acaba de hablar con el cliente y sabe qué hay que retomar.
  const canAutomate = hasPermission("crm:automate");

  if (loading && contact === null) {
    return (
      <div className="flex flex-col gap-4 p-4" role="status" aria-label="Cargando el contacto">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-[20px]" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error !== null || contact === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-[18px] bg-muted text-muted-foreground">
          <UserRound className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-semibold">No pudimos traer el contacto</p>
        <p className="max-w-60 text-xs text-muted-foreground">{error ?? "No se encontró el contacto."}</p>
        <Button variant="outline" className="h-9 rounded-full" onClick={reload}>
          Reintentar
        </Button>
      </div>
    );
  }

  const name = contactDisplayName(contact);

  return (
    <>
      <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={contact.avatar_url} alt={`Avatar de ${name}`} fallback={name} size={48} className="shrink-0" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <StatePill tone={CONTACT_STAGE_TONE[contact.lifecycle_stage]}>{CONTACT_STAGE_LABELS[contact.lifecycle_stage]}</StatePill>
          </div>
        </div>

        {profile !== null && <ScorePanel profile={profile} className="rounded-[20px] p-4" />}

        <ContactFieldList contact={contact} profile={profile} tags={tags} ownerName={ownerName} />

        <ContactDataPanel contactId={contact.id} conversationId={conversation.id} variant="rail" />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3.5">
        {canAutomate && (
          <Button asChild variant="outline" className="h-10 w-full rounded-full">
            <Link
              href={`/crm/tasks/create?executor=agent&contact_id=${contact.id}&contact_label=${encodeURIComponent(name)}`}
            >
              <Sparkles className="size-3.5 text-accent-violet" aria-hidden />
              Programar seguimiento
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="h-10 w-full rounded-full">
          <Link href={`/crm/contacts/${contact.id}`}>
            Ver ficha completa
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  );
}
