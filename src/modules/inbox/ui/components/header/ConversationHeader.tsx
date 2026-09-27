"use client"

import Link from "next/link"
import { ArrowLeft, CheckCheck, Sparkles } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { elapsedShort } from "@/core/lib/day-label"
import { relativeTime } from "@/core/lib/relative-time"
import { Avatar } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { ContactOwnerSelect } from "@/modules/crm/public"
import { STATUS_LABELS, waitingSince, type ConversationDTO } from "@/modules/inbox/domain/inbox"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useConversationContact } from "@/modules/inbox/infrastructure/stores/contact-context.context"
import { ClaimIsland } from "./ClaimIsland"
import { HeaderOverflowMenu } from "./HeaderOverflowMenu"
import type { HandoffActionsState } from "./use-handoff-actions"

/**
 * Cabecera del chat (Inbox premium F2), en una sola fila de 64 px:
 * - a la izquierda, la identidad (el único elemento navegable: abre el panel
 *   Contacto) con «canal · teléfono · esperando X»;
 * - a la derecha, la píldora de QUIÉN LA TIENE, el responsable, la acción
 *   principal en `contrast` (Intervenir o Cerrar) y el menú ⋮.
 *
 * En cola, la píldora y el botón se vuelven UNA isla, `ClaimIsland`: «Axi te la
 * pasó · 14 min · Atender», que entra con animación cuando hace falta atender.
 * La isla grande sobre el hilo se retiró a pedido de la dueña porque estorbaba.
 *
 * Etapa, score y etiquetas ya no compiten aquí: viven en el panel Contacto del
 * rail (F4). La altura no cambia entre modos ni sin permiso de handoff; solo
 * cambian los controles que se pintan.
 *
 * Las acciones llegan de `useHandoffActions`, que monta el panel una sola vez
 * para la cabecera, la isla «Por qué está aquí» y la barra del composer.
 */

export type HolderKind = "queued" | "ai" | "self" | "team" | "done"

/** Quién la tiene, en una píldora: el color en el punto o el icono, el texto en foreground. */
export function conversationHolder(
  conversation: Pick<ConversationDTO, "status" | "mode" | "assigned_user_id" | "queued_at">,
  meId: string | null,
  now: number,
): { kind: HolderKind; text: string } {
  if (conversation.status === "resolved" || conversation.status === "closed") {
    return { kind: "done", text: STATUS_LABELS[conversation.status] }
  }
  if (conversation.status === "snoozed") return { kind: "team", text: STATUS_LABELS.snoozed }
  if (conversation.mode === "human_queued") {
    const since = conversation.queued_at === null ? "" : elapsedShort(conversation.queued_at, now)
    return { kind: "queued", text: since === "" ? "En cola" : `En cola · ${since}` }
  }
  if (conversation.mode === "ai_active") return { kind: "ai", text: "Axi atiende" }
  if (meId !== null && conversation.assigned_user_id === meId) return { kind: "self", text: "Contigo" }
  return { kind: "team", text: "Con el equipo" }
}

const HOLDER_DOT: Partial<Record<HolderKind, string>> = {
  queued: "bg-warning",
  self: "bg-foreground",
  team: "bg-muted-foreground",
}

export function HolderPill({ kind, text, className }: { kind: HolderKind; text: string; className?: string }) {
  const dot = HOLDER_DOT[kind]
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap tabular-nums", className)}>
      {kind === "ai" && <Sparkles aria-hidden className="size-3 text-accent-violet" />}
      {kind === "done" && <CheckCheck aria-hidden className="size-3 text-muted-foreground" />}
      {dot !== undefined && <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />}
      {text}
    </span>
  )
}

export function ConversationHeader({
  conversation,
  handoff,
  meId,
  now,
  reason = null,
}: {
  conversation: ConversationDTO
  handoff: HandoffActionsState
  /** Por qué Axi la pasó, en una frase (del último `escalated`): va en la isla de Atender. */
  reason?: string | null
  meId: string | null
  /** El tick de un minuto del panel: «En cola · 14 min» avanza solo. */
  now: number
}) {
  const select = useInboxStore((s) => s.select)
  const bumpContactContext = useInboxStore((s) => s.bumpContactContext)
  const { profile, ownerName } = useConversationContact()
  const { primary, secondary, dialogs, busy } = handoff

  const contactName = conversation.contact.full_name || conversation.contact.phone || "Sin nombre"
  const since = waitingSince(conversation)
  const waiting = since !== null ? relativeTime(since, new Date(now)) : null
  const holder = conversationHolder(conversation, meId, now)
  const claim = primary?.id === "claim" ? primary : null

  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
      {/* Volver a la lista en móvil (maestro-detalle); en md+ la lista ya se ve */}
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 size-10 shrink-0 md:hidden"
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
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 pr-1 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Avatar src={conversation.contact.avatar_url} alt="" fallback={contactName} size={38} className="shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={contactName}>
            {contactName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[conversation.channel.name, conversation.contact.phone, waiting !== null ? `esperando ${waiting}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>

      {claim === null && <HolderPill kind={holder.kind} text={holder.text} className="hidden sm:inline-flex" />}

      <div className="flex shrink-0 items-center gap-1">
        <ContactOwnerSelect
          contactId={conversation.contact.id}
          ownerUserId={profile?.owner_user_id ?? null}
          ownerName={ownerName}
          // El responsable vive en el contexto compartido: al cambiarlo hay que
          // invalidarlo para que la cabecera y el rail vean el nuevo valor.
          onChanged={() => bumpContactContext(conversation.contact.id)}
          // Solo avatar por debajo de xl: a ese ancho el nombre competiría con el del contacto.
          labelClassName="hidden xl:inline-flex"
        />

        {claim !== null ? (
          <ClaimIsland
            action={claim}
            reason={reason}
            since={conversation.queued_at === null ? null : elapsedShort(conversation.queued_at, now)}
            busy={busy}
          />
        ) : primary !== null && (
          <Button variant="contrast" className="h-9 px-3.5" disabled={busy} onClick={primary.onSelect}>
            <primary.icon className="size-4" aria-hidden />
            {primary.label}
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
