"use client";

import Link from "next/link";
import { ExternalLink, UserRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar } from "@/shared/components/ui/avatar";
import {
  CONTACT_STAGE_BADGE_CLASSES,
  CONTACT_STAGE_LABELS,
  ContactFieldList,
  contactDisplayName,
} from "@/modules/crm/public";
import { useConversationContact } from "@/modules/inbox/infrastructure/stores/contact-context.context";

/**
 * Ficha del contacto de la conversación, en solo lectura. La edición vive en el
 * 360 del CRM (link del footer): el operador consulta en caliente, no
 * administra desde el inbox.
 */
export function ContactPanel() {
  // El contexto lo resuelve `InboxView` una sola vez y lo comparte con la
  // cabecera del chat: aquí no se vuelve a pedir nada.
  const { contact, profile, tags, ownerName, loading, error, reload } = useConversationContact();

  if (loading && contact === null) {
    return (
      <div className="space-y-4 p-4" role="status" aria-label="Cargando contacto">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (error !== null || contact === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <UserRound className="size-10 opacity-30" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {error ?? "No se encontró el contacto."}
        </p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={reload}>
          Reintentar
        </Button>
      </div>
    );
  }

  const name = contactDisplayName(contact);

  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sidebar-scroll">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar src={contact.avatar_url} alt={`Avatar de ${name}`} fallback={name} size={56} />
          <div>
            <p className="font-medium">{name}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Badge variant="outline" className={CONTACT_STAGE_BADGE_CLASSES[contact.lifecycle_stage]}>
                {CONTACT_STAGE_LABELS[contact.lifecycle_stage]}
              </Badge>
              {profile !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Score {profile.score}
                </span>
              )}
            </div>
          </div>
        </div>

        <ContactFieldList
          contact={contact}
          profile={profile}
          tags={tags}
          ownerName={ownerName}
        />
      </div>

      <div className="border-t border-border p-3">
        <Button asChild variant="outline" size="sm" className="w-full rounded-full">
          <Link href={`/crm/contacts/${contact.id}`}>
            Ver ficha completa
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  );
}
