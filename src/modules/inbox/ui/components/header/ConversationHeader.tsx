"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { relativeTime } from "@/core/lib/relative-time"
import { Avatar } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { ContactOwnerSelect } from "@/modules/crm/public"
import { waitingSince, type ConversationDTO } from "@/modules/inbox/domain/inbox"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useConversationContact } from "@/modules/inbox/infrastructure/stores/contact-context.context"
import { ConversationChips } from "./ConversationChips"
import { HeaderOverflowMenu } from "./HeaderOverflowMenu"
import { useHandoffActions } from "./use-handoff-actions"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"

/**
 * Cabecera del chat en UNA sola fila de 40px (≈57px con padding y borde).
 *
 * Antes eran dos filas —identidad arriba, acciones de handoff debajo— que
 * sumaban ~105px, y la segunda reservaba 32px para uno o dos botones. Ahora:
 * identidad a la izquierda, chips de contexto a continuación, y a la derecha el
 * responsable, la acción destacada y el menú de desborde.
 *
 * La altura NO cambia entre modos ni cuando falta el permiso de handoff: lo que
 * varía es qué controles se pintan, nunca cuántas filas hay.
 *
 * Ojo con el `<Link>`: envuelve SOLO el bloque de identidad. Los chips y los
 * controles quedan fuera — anidar interactivos dentro de un enlace rompe la
 * accesibilidad y haría que un clic en el selector navegase.
 */
export function ConversationHeader({
  conversation,
  commands,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
}) {
  const select = useInboxStore((s) => s.select)
  const bumpContactContext = useInboxStore((s) => s.bumpContactContext)
  const { profile, ownerName } = useConversationContact()
  const { primary, secondary, dialogs, busy } = useHandoffActions(conversation, commands)

  const contactName = conversation.contact.full_name || conversation.contact.phone || "Sin nombre"
  const since = waitingSince(conversation)
  const waiting = since !== null ? relativeTime(since) : null

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/60 px-3">
      {/* Volver a la lista en móvil (maestro-detalle); en md+ la lista ya se ve */}
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 md:hidden"
        aria-label="Volver a la lista"
        onClick={() => void select(null)}
      >
        <ArrowLeft className="size-4" aria-hidden />
      </Button>

      {/* Identidad: el único elemento navegable de la fila */}
      <Link
        href="?panel=contact"
        scroll={false}
        aria-label={`Ver contacto de ${contactName}`}
        className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-1 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Avatar
          src={conversation.contact.avatar_url}
          alt=""
          fallback={contactName}
          size={36}
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{contactName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[
              conversation.contact.phone,
              conversation.channel.name,
              waiting !== null ? `esperando ${waiting}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>

      <ConversationChips conversation={conversation} />

      {/* Controles a la derecha */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ContactOwnerSelect
          contactId={conversation.contact.id}
          ownerUserId={profile?.owner_user_id ?? null}
          ownerName={ownerName}
          // El responsable vive en el contexto compartido: al cambiarlo hay que
          // invalidarlo para que la cabecera y el rail vean el nuevo valor.
          onChanged={() => bumpContactContext(conversation.contact.id)}
          // Solo avatar por debajo de lg: a ese ancho el nombre del responsable
          // competiría con el del contacto por el espacio de la fila.
          labelClassName="hidden lg:inline-flex"
        />

        {primary !== null && (
          <Button
            size="sm"
            variant={conversation.mode === "human_queued" ? "default" : "outline"}
            className="h-8"
            disabled={busy}
            onClick={primary.onSelect}
          >
            <primary.icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{primary.label}</span>
          </Button>
        )}

        <HeaderOverflowMenu
          actions={secondary}
          phone={conversation.contact.phone}
          contactId={conversation.contact.id}
          disabled={busy}
        />
      </div>

      {dialogs}
    </div>
  )
}
