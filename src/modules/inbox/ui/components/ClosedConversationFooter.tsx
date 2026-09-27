import { CheckCheck } from "lucide-react"
import { formatFullDateTime } from "@/core/lib/day-label"
import { STATUS_LABELS, type ConversationDTO } from "@/modules/inbox/domain/inbox"

/**
 * Sustituye al composer en una conversación `resolved`/`closed`: el historial
 * se consulta, no se continúa (el servidor además responde 409
 * `conversations/closed`). Superficie sólida, misma altura que una fila del
 * composer para que el hilo no salte al cambiar de conversación.
 *
 * F2: dice también QUIÉN la cerró («por Axi», «por ti», «por el equipo»), a
 * partir del evento `closed` del hilo. Sin ese evento, calla el actor. No
 * promete que se reabre: el servidor no emite `reopened`.
 */
export function ClosedConversationFooter({ conversation, by = null }: { conversation: ConversationDTO; by?: string | null }) {
  const when = conversation.closed_at ?? conversation.last_message_at
  const label = STATUS_LABELS[conversation.status]
  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 border-t border-border bg-background px-4 py-3.5 text-center text-xs text-foreground/80"
    >
      <CheckCheck aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <span>
        {label}
        {when !== null && (
          <>
            {" el "}
            <time dateTime={when} className="tabular-nums">
              {formatFullDateTime(when)}
            </time>
          </>
        )}
        {by !== null && ` · ${by}`}
        <span className="text-muted-foreground"> · el historial se consulta, no se continúa</span>
      </span>
    </div>
  )
}
