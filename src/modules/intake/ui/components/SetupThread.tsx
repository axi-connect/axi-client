"use client";

import { Check } from "lucide-react";

import type { IntakeMessage } from "@/modules/intake/domain/intake";
import type { UiMessage } from "@/modules/intake/infrastructure/stores/intake.store";
import {
  AssistantBubble,
  AssistantQuestion,
  AssistantThinking,
  UserBubble,
  type AssistantQuestionLabels,
} from "@/shared/components/features/assistant";

/** Los textos de la pregunta en boca de Alba. */
const QUESTION_LABELS: Partial<AssistantQuestionLabels> = {
  live: "Elige una",
  answered: "Ya respondida",
  writeInstead: "Prefiero contarlo yo",
};

interface SetupThreadProps {
  messages: UiMessage[];
  assistantName: string;
  thinking: boolean;
  turnError: string | null;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
  onRetry: () => void;
}

/**
 * El hilo de la entrevista, compuesto con las burbujas del kit. Lo único que
 * es del intake: la línea «✓ Anotado · Horario · Ciudad» bajo la respuesta de
 * Alba —como el «Entregado» de Messages, no tres pastillas gritando— y los
 * textos de la pregunta. Sigue haciendo lo que importa: si Alba entendió mal,
 * se ve en el acto y se corrige hablando o desde la ficha.
 *
 * Solo la última pregunta está viva: se resuelve por posición en el hilo, sin
 * ninguna columna. Los mensajes con id local (`pending-*`, `assistant-*`)
 * nacieron en esta sesión y entran animados; los del historial, no.
 */
export function SetupThread({
  messages,
  assistantName,
  thinking,
  turnError,
  onPick,
  onWriteInstead,
  onRetry,
}: SetupThreadProps) {
  const lastQuestionId = [...messages].reverse().find((message) => message.question !== null)?.id;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div role="log" aria-label={`Conversación con ${assistantName}`} className="flex flex-col gap-4">
        {messages.map((message) =>
          message.role === "client" ? (
            <UserBubble
              key={message.id}
              body={message.body}
              pending={message.pending === true}
              failed={message.failed === true ? (turnError ?? "No salió.") : null}
              voice={message.voice}
              onRetry={onRetry}
              retryLabel="Reintentar"
              fresh={isFresh(message)}
            />
          ) : (
            <AssistantBubble key={message.id} name={assistantName} body={message.body} fresh={isFresh(message)}>
              {message.captured.length > 0 ? <Captured items={message.captured} /> : null}
              {message.question === null ? null : (
                <AssistantQuestion
                  question={message.question}
                  live={message.id === lastQuestionId}
                  busy={thinking}
                  onPick={onPick}
                  onWriteInstead={onWriteInstead}
                  labels={QUESTION_LABELS}
                />
              )}
            </AssistantBubble>
          ),
        )}
      </div>

      {thinking ? <AssistantThinking /> : null}
    </div>
  );
}

function Captured({ items }: { items: IntakeMessage["captured"] }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 px-4 pb-3 text-[12px] font-medium text-success">
      <Check className="size-[13px] [stroke-width:2.6]" aria-hidden="true" />
      <span>Anotado</span>
      {items.map((item) => (
        <span key={item.code} className="font-normal before:mr-1.5 before:text-muted-foreground/60 before:content-['·']">
          {item.label}
        </span>
      ))}
    </p>
  );
}

const isFresh = (message: UiMessage): boolean =>
  message.id.startsWith("pending-") || message.id.startsWith("assistant-");
