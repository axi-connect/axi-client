import { CheckCheck } from "lucide-react"
import { formatFullDateTime } from "@/core/lib/day-label"
import { STATUS_LABELS, type ConversationDTO } from "@/modules/inbox/domain/inbox"

/**
 * Sustituye al composer en una conversación `resolved`/`closed`: el historial
 * se consulta, no se continúa (el servidor además responde 409
 * `conversations/closed`). Superficie sólida y atenuada, misma altura que una
 * fila del composer para que el hilo no salte al cambiar de conversación.
 */
export function ClosedConversationFooter({ conversation }: { conversation: ConversationDTO }) {
  const when = conversation.closed_at ?? conversation.last_message_at
  const label = STATUS_LABELS[conversation.status].toLowerCase()
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-t border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground"
    >
      <CheckCheck aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        Conversación {label}
        {when !== null && (
          <>
            {" el "}
            <time dateTime={when} className="tabular-nums">
              {formatFullDateTime(when)}
            </time>
          </>
        )}
      </span>
    </div>
  )
}
