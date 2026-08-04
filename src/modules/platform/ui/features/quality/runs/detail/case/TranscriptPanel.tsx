/**
 * Transcript del case como chat: cliente simulado (inbound) a la izquierda,
 * agente (outbound) a la derecha con fondo de acento suave; system/user en
 * chip centrado neutro. `body` null → mensaje omitido con placeholder;
 * `content_type` no textual → etiqueta del tipo. Crece en vivo mientras el
 * case corre (el polling del detalle lo refresca).
 */
import { cn } from "@/core/lib/utils";
import type { CaseDetail } from "../../../../../../domain/quality-runs";

type TranscriptMessage = CaseDetail["transcript"][number];

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const SENDER_LABELS: Record<TranscriptMessage["sender_type"], string> = {
  contact: "Cliente simulado",
  ai_agent: "Agente",
  user: "Operador",
  system: "Sistema",
};

function bubbleBody(message: TranscriptMessage): string {
  if (message.body) return message.body;
  if (message.content_type !== "text") return `[${message.content_type}]`;
  return "(mensaje sin contenido)";
}

export function TranscriptPanel({ transcript }: { transcript: CaseDetail["transcript"] }) {
  if (transcript.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Todavía no hay mensajes: el transcript aparece a medida que la conversación avanza.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {transcript.map((message) => {
        const isSystemish = message.sender_type === "system" || message.sender_type === "user";
        const isAgent = message.direction === "outbound";

        if (isSystemish) {
          return (
            <li key={message.id} className="flex justify-center">
              <span className="max-w-[85%] rounded-full border border-border bg-muted/50 px-3 py-1 text-center text-xs text-muted-foreground">
                {SENDER_LABELS[message.sender_type]}: {bubbleBody(message)}
              </span>
            </li>
          );
        }

        return (
          <li key={message.id} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                isAgent ? "rounded-br-md bg-accent" : "rounded-bl-md bg-muted/60",
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {SENDER_LABELS[message.sender_type]}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{bubbleBody(message)}</p>
              <p className="mt-1 text-right text-[10px] text-muted-foreground tabular-nums">
                {TIME.format(new Date(message.created_at))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
