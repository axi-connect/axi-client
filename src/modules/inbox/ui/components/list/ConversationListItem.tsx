"use client"

import { memo } from "react"
import {
  Camera,
  CheckCheck,
  FileText,
  Film,
  MapPin,
  Mic,
  Sparkles,
  Sticker,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/core/lib/utils"
import { elapsedShort, formatConversationTime, formatFullDateTime } from "@/core/lib/day-label"
import { Avatar } from "@/shared/components/ui/avatar"
import { ChannelKindIcon } from "@/modules/channels/public"
import {
  isNotablePriority,
  isReadOnlyConversation,
  parsePreview,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type InboxConversation,
  type MediaContentKind,
} from "@/modules/inbox/domain/inbox"

/** Icono por tipo de media en el preview (patrón WhatsApp). */
const PREVIEW_ICONS: Record<MediaContentKind, LucideIcon> = {
  image: Camera,
  audio: Mic,
  video: Film,
  document: FileText,
  sticker: Sticker,
  location: MapPin,
}

/**
 * Tercera línea de la fila: una cápsula con el estado, como `StatePill` (el
 * color en el punto o el icono, el texto en foreground). Solo existe cuando
 * dice algo, para que la lista respire:
 * - cerrada: qué pasó y cuándo;
 * - en cola: cuánto lleva esperando;
 * - quién atiende, solo cuando la vista mezcla modos («Todas abiertas»).
 */
export type Meta =
  | { kind: "done"; text: string }
  | { kind: "queued"; text: string }
  | { kind: "ai"; text: string }
  | { kind: "self"; text: string }
  | { kind: "team"; text: string }

export function conversationMeta(
  conversation: InboxConversation,
  now: number,
  showMode: boolean,
  meId: string | null = null,
): Meta | null {
  if (isReadOnlyConversation(conversation)) {
    const when = conversation.closed_at ?? conversation.last_message_at
    return {
      kind: "done",
      text: when === null ? STATUS_LABELS[conversation.status] : `${STATUS_LABELS[conversation.status]} · ${formatConversationTime(when, now)}`,
    }
  }
  if (conversation.mode === "human_queued") {
    const since = conversation.queued_at ?? conversation.last_inbound_at
    return { kind: "queued", text: since === null ? "En cola" : `En cola · ${elapsedShort(since, now)}` }
  }
  if (!showMode) return null
  if (conversation.mode === "ai_active") return { kind: "ai", text: "Axi atiende" }
  if (meId !== null && conversation.assigned_user_id === meId) return { kind: "self", text: "Contigo" }
  return { kind: "team", text: "Con el equipo" }
}

const META_DOT: Partial<Record<Meta["kind"], string>> = {
  queued: "bg-warning",
  self: "bg-foreground",
  team: "bg-muted-foreground",
}

function MetaPill({ meta }: { meta: Meta }) {
  const dot = META_DOT[meta.kind]
  return (
    <span className="mt-1 inline-flex h-[22px] max-w-full min-w-0 items-center gap-1.5 self-start rounded-full bg-muted px-2 text-[11px] font-medium text-foreground">
      {meta.kind === "ai" && <Sparkles aria-hidden className="size-3 shrink-0 text-accent-violet" />}
      {meta.kind === "done" && <CheckCheck aria-hidden className="size-3 shrink-0 text-muted-foreground" />}
      {dot !== undefined && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
      <span className="truncate tabular-nums">{meta.text}</span>
    </span>
  )
}

function contactName(conversation: InboxConversation): string {
  return conversation.contact.full_name || conversation.contact.phone || "Sin nombre"
}

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  active,
  now,
  showMode,
  meId = null,
  onSelect,
}: {
  conversation: InboxConversation
  active: boolean
  /** `Date.now()` compartido por la lista (un solo temporizador). */
  now: number
  /** Pintar «IA» en la tercera línea: solo cuando la vista mezcla modos. */
  showMode: boolean
  /** Quien mira: en «Todas abiertas» distingue «Contigo» de «Con el equipo». */
  meId?: string | null
  onSelect: (id: string) => void
}) {
  const name = contactName(conversation)
  const closed = isReadOnlyConversation(conversation)
  const unread = closed ? 0 : conversation.unread_count
  const preview = parsePreview(conversation.last_message_preview)
  const PreviewIcon = preview.kind ? PREVIEW_ICONS[preview.kind] : null
  const meta = conversationMeta(conversation, now, showMode, meId)
  const notable = !closed && isNotablePriority(conversation.priority)
  const iso = conversation.last_message_at
  const fullDate = iso === null ? "" : formatFullDateTime(iso)

  const ariaLabel = [
    name,
    unread > 0 ? `${String(unread)} sin leer` : null,
    notable ? `prioridad ${PRIORITY_LABELS[conversation.priority].toLowerCase()}` : null,
    meta?.text ?? null,
    fullDate || null,
  ]
    .filter((part) => part !== null)
    .join(", ")

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={active ? "true" : undefined}
        aria-label={ariaLabel}
        data-priority={notable ? conversation.priority : undefined}
        className={cn(
          "group relative flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left outline-none",
          "transition-[background-color,transform] duration-150 motion-reduce:transition-none",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "active:scale-[0.99] motion-reduce:active:scale-100",
          // Seleccionada: anillo neutro, como la selección de Cobros y CRM.
          active ? "bg-accent ring-[1.5px] ring-foreground ring-inset" : "hover:bg-accent/50",
        )}
      >
        <span className="relative shrink-0">
          <Avatar
            src={conversation.contact.avatar_url}
            alt=""
            fallback={name}
            size={40}
            className={cn("text-sm", closed && "opacity-80 grayscale")}
          />
          <span
            role="img"
            aria-label={`Canal: ${conversation.channel.name}`}
            className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-background ring-2 ring-background"
          >
            <ChannelKindIcon kind={conversation.channel.kind} className="size-3" />
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            {/* Prioridad: un punto antes del nombre, solo high/urgent. Ámbar = atención, rojo = peligro. */}
            {notable && (
              <span
                aria-hidden="true"
                title={`Prioridad ${PRIORITY_LABELS[conversation.priority].toLowerCase()}`}
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  conversation.priority === "urgent" ? "bg-destructive" : "bg-warning",
                )}
              />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                closed
                  ? "font-medium text-muted-foreground"
                  : unread > 0
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground",
              )}
              title={name}
            >
              {name}
            </span>
            {iso !== null && (
              <time
                dateTime={iso}
                title={fullDate}
                className={cn(
                  "ml-0.5 shrink-0 text-[11px] tabular-nums",
                  unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {formatConversationTime(iso, now)}
              </time>
            )}
          </span>

          <span className="flex items-center gap-2">
            <span
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1 text-xs",
                unread > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {PreviewIcon && <PreviewIcon className="size-3 shrink-0" aria-hidden="true" />}
              <span className="truncate">{preview.text}</span>
            </span>
            {unread > 0 && (
              <span
                aria-hidden="true"
                // Tinta, no coral: el coral es acción (D2 del plan, aprobado en el lienzo de F1).
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-background"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>

          {meta && <MetaPill meta={meta} />}
        </span>
      </button>
    </li>
  )
})
