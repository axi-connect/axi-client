/**
 * Transcript del case como chat: cliente simulado (inbound) a la izquierda,
 * agente (outbound) a la derecha con fondo de acento suave; system/user en
 * chip centrado neutro. `body` null → mensaje omitido con placeholder;
 * `content_type` no textual → etiqueta del tipo. Crece en vivo mientras el
 * case corre (el polling del detalle lo refresca). La burbuja es la misma
 * que pinta el simulacro (`shared/ChatBubble`).
 */
import type { CaseDetail } from "../../../../../../domain/quality-runs";
import { bubbleSideFor, ChatBubble } from "../../../shared/ChatBubble";

type TranscriptMessage = CaseDetail["transcript"][number];

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
      {transcript.map((message) => (
        <ChatBubble
          key={message.id}
          side={bubbleSideFor(message)}
          sender={SENDER_LABELS[message.sender_type]}
          body={bubbleBody(message)}
          createdAt={message.created_at}
        />
      ))}
    </ol>
  );
}
