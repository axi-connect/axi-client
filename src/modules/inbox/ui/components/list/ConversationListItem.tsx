"use client"

import { memo } from "react"
import {
  Bot,
  Camera,
  CheckCheck,
  FileText,
  Film,
  MapPin,
  Mic,
  Sticker,
  Timer,
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

type Meta = { icon: LucideIcon; text: string; tone: "muted" | "warning" }

/**
 * Tercera línea de la fila. Solo existe en estados que NO son el default,
 * para que la lista respire: cerrada (qué pasó y cuándo), en cola (cuánto
 * lleva esperando) e IA cuando la vista mezcla modos.
 */
export function conversationMeta(
  conversation: InboxConversation,
  now: number,
  showMode: boolean,
): Meta | null {
  if (isReadOnlyConversation(conversation)) {
    const when = conversation.closed_at ?? conversation.last_message_at
    return {
      icon: CheckCheck,
      text: when === null ? STATUS_LABELS[conversation.status] : `${STATUS_LABELS[conversation.status]} · ${formatConversationTime(when, now)}`,
      tone: "muted",
    }
  }
  if (conversation.mode === "human_queued") {
    const since = conversation.queued_at ?? conversation.last_inbound_at
    return {
      icon: Timer,
      text: since === null ? "En cola" : `En cola · ${elapsedShort(since, now)}`,
      tone: "warning",
    }
  }
  if (showMode && conversation.mode === "ai_active") {
    return { icon: Bot, text: "IA", tone: "muted" }
  }
  return null
}

function contactName(conversation: InboxConversation): string {
  return conversation.contact.full_name || conversation.contact.phone || "Sin nombre"
}

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  active,
  now,
  showMode,
  onSelect,
}: {
  conversation: InboxConversation
  active: boolean
  /** `Date.now()` compartido por la lista (un solo temporizador). */
  now: number
  /** Pintar «IA» en la tercera línea: solo cuando la vista mezcla modos. */
  showMode: boolean
  onSelect: (id: string) => void
}) {
  const name = contactName(conversation)
  const closed = isReadOnlyConversation(conversation)
  const unread = closed ? 0 : conversation.unread_count
  const preview = parsePreview(conversation.last_message_preview)
  const PreviewIcon = preview.kind ? PREVIEW_ICONS[preview.kind] : null
  const meta = conversationMeta(conversation, now, showMode)
  const notable = !closed && isNotablePriority(conversation.priority)
  const iso = conversation.last_message_at
  const fullDate = iso === null ? "" : formatFullDateTime(iso)

  const ariaLabel = [
    name,
    unread > 0 ? `${String(unread)} sin leer` : null,
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
          "group relative flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none",
          "transition-[background-color,transform] duration-150 motion-reduce:transition-none",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "active:scale-[0.99] motion-reduce:active:scale-100",
          active ? "bg-accent" : "hover:bg-accent/50",
        )}
      >
        {/* Prioridad: barra fina, solo high/urgent. Ámbar = atención, rojo = peligro. */}
        {notable && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-3 bottom-3 left-0 w-0.5 rounded-full",
              conversation.priority === "urgent" ? "bg-destructive" : "bg-warning",
            )}
          />
        )}

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
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                closed
                  ? "font-medium text-muted-foreground"
                  : unread > 0
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground",
              )}
            >
              {name}
            </span>
            {iso !== null && (
              <time
                dateTime={iso}
                title={fullDate}
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  unread > 0 ? "font-medium text-brand" : "text-muted-foreground",
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
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold tabular-nums text-white dark:text-background"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>

          {meta && (
            <span
              className={cn(
                "flex items-center gap-1 text-[11px]",
                meta.tone === "warning" ? "text-warning" : "text-muted-foreground",
              )}
            >
              <meta.icon className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate tabular-nums">{meta.text}</span>
            </span>
          )}
        </span>
      </button>
    </li>
  )
})
