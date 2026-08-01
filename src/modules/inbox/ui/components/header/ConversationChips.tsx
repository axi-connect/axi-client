"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { CONTACT_STAGE_BADGE_CLASSES, CONTACT_STAGE_LABELS } from "@/modules/crm/public"
import {
  MODE_LABELS,
  STATUS_LABELS,
  isNotablePriority,
  type ConversationDTO,
} from "@/modules/inbox/domain/inbox"
import { useConversationContact } from "@/modules/inbox/infrastructure/stores/contact-context.context"

/**
 * Señales de contexto de la cabecera del chat.
 *
 * PRESUPUESTO DE CHIPS (DESIGN.md §8: la jerarquía la hace la tipografía, y no
 * compiten dos acentos). Entre modo, estado, etapa, score, prioridad y etiquetas
 * hay seis señales posibles en una fila de 40px, así que:
 * - Score y espera van como TEXTO, no como badge (la espera la pinta la cabecera).
 * - La prioridad solo aparece si es `high`/`urgent`; `normal`/`low` serían ruido.
 * - Las etiquetas van en gris aunque el tenant les dé color: seis colores
 *   distintos junto a etapa y prioridad rompen la regla de un solo acento. El
 *   color se conserva en el panel Contacto del rail, donde hay sitio.
 * - Lo que no cabe se OCULTA por ancho; el juego completo está en el rail.
 */

const MAX_VISIBLE_TAGS = 2

const PRIORITY_LABELS: Record<ConversationDTO["priority"], string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
}

export function ConversationChips({ conversation }: { conversation: ConversationDTO }) {
  const { contact, profile, tags } = useConversationContact()

  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS)
  const hiddenTagCount = tags.length - visibleTags.length

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {/* Etapa del contacto: la señal más útil y la única visible en móvil */}
      {contact !== null && (
        <Badge
          variant="outline"
          className={cn("text-[10px]", CONTACT_STAGE_BADGE_CLASSES[contact.lifecycle_stage])}
        >
          {CONTACT_STAGE_LABELS[contact.lifecycle_stage]}
        </Badge>
      )}

      {/* Quién atiende ahora */}
      <Badge variant="secondary" className="hidden text-[10px] md:inline-flex">
        {MODE_LABELS[conversation.mode]}
      </Badge>

      {conversation.status !== "open" && (
        <Badge variant="outline" className="hidden text-[10px] md:inline-flex">
          {STATUS_LABELS[conversation.status]}
        </Badge>
      )}

      {/* Prioridad: de solo lectura, el backend no expone forma de cambiarla */}
      {isNotablePriority(conversation.priority) && (
        <Badge
          variant="outline"
          className={cn(
            "hidden gap-1 text-[10px] lg:inline-flex",
            conversation.priority === "urgent"
              ? "border-destructive/40 text-destructive"
              : "border-warning/40 text-warning",
          )}
        >
          <AlertTriangle className="size-3" aria-hidden />
          {PRIORITY_LABELS[conversation.priority]}
        </Badge>
      )}

      {/* Score del embudo: número, no badge */}
      {profile !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="hidden text-xs text-muted-foreground tabular-nums lg:inline">
              {profile.score}
            </span>
          </TooltipTrigger>
          <TooltipContent>Score del embudo: {profile.score}/100</TooltipContent>
        </Tooltip>
      )}

      {visibleTags.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="hidden items-center gap-1.5 xl:inline-flex">
              {visibleTags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
              {hiddenTagCount > 0 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  +{hiddenTagCount}
                </Badge>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tags.map((tag) => tag.name).join(" · ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
