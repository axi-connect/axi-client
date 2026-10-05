"use client";

import { Fragment, memo, type ReactNode, type Ref } from "react";
import { Check } from "lucide-react";

import type { IntakeMessage } from "@/modules/intake/domain/intake";
import type { UiMessage } from "@/modules/intake/infrastructure/stores/intake.store";
import {
  AssistantBubble,
  AssistantListenButton,
  AssistantQuestion,
  AssistantThinking,
  UserBubble,
  type AssistantQuestionLabels,
} from "@/shared/components/features/assistant";

/** Los textos de la pregunta en boca de Alba. */
const QUESTION_LABELS: Partial<AssistantQuestionLabels> = {
  live: "Elige una",
  answered: "Ya respondida",
  writeInstead: "Otra respuesta: escribirla yo",
};

interface SetupThreadProps {
  messages: UiMessage[];
  assistantName: string;
  thinking: boolean;
  turnError: string | null;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
  onRetry: () => void;
  /**
   * Lo que va tras el saludo: la revisión de lo encontrado (paso 1), con su
   * tarjeta viva y las ya resueltas. `null` cuando no hay nada que revisar.
   */
  review?: ReactNode;
  /** La burbuja de la pregunta viva, para que la isla la tome si no se ve (D1). */
  liveQuestionRef?: Ref<HTMLDivElement>;
  /** Al empezar a escuchar una pregunta: para contarlo. */
  onListen?: () => void;
}

/**
 * El hilo de la entrevista, compuesto con las burbujas del kit. Lo único que
 * es del intake: la línea «✓ Anotado · Horario · Ciudad» bajo la respuesta de
 * Alba —como el «Entregado» de Messages, no tres pastillas gritando— y los
 * textos de la pregunta. Sigue haciendo lo que importa: si Alba entendió mal,
 * se ve en el acto y se corrige hablando o desde la ficha.
 *
 * Solo la última pregunta está viva: se resuelve por posición en el hilo, sin
 * ninguna columna. `memo`: guardar un dato de la ficha repinta la vista, no el
 * hilo (sus props son `messages` y callbacks estables). Los mensajes con id local (`pending-*`, `assistant-*`)
 * nacieron en esta sesión y entran animados; los del historial, no.
 */
export const SetupThread = memo(function SetupThread({
  messages,
  assistantName,
  thinking,
  turnError,
  onPick,
  onWriteInstead,
  onRetry,
  review = null,
  liveQuestionRef,
  onListen,
}: SetupThreadProps) {
  const lastQuestionId = [...messages].reverse().find((message) => message.question !== null)?.id;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div role="log" aria-label={`Conversación con ${assistantName}`} className="flex flex-col gap-4">
        {messages.map((message, index) => {
          const live = message.question !== null && message.id === lastQuestionId;
          const bubble =
            message.role === "client" ? (
              <UserBubble
                body={message.body}
                pending={message.pending === true}
                failed={message.failed === true ? (turnError ?? "No salió.") : null}
                voice={message.voice}
                onRetry={onRetry}
                retryLabel="Reintentar"
                fresh={isFresh(message)}
              />
            ) : (
              <AssistantBubble
                name={assistantName}
                body={message.body}
                fresh={isFresh(message)}
                ref={live ? liveQuestionRef : undefined}
                aside={
                  live && message.question !== null ? (
                    <AssistantListenButton
                      id={`question-${message.id}`}
                      text={spoken(message.body, message.question.question)}
                      onListen={onListen}
                    />
                  ) : null
                }
              >
                {message.captured.length > 0 ? <Captured items={message.captured} /> : null}
                {message.question === null ? null : (
                  <>
                    {message.question.why === null || message.question.why === undefined ? null : (
                      <Why text={message.question.why} />
                    )}
                    <AssistantQuestion
                      question={message.question}
                      live={live}
                      busy={thinking}
                      onPick={onPick}
                      onWriteInstead={onWriteInstead}
                      labels={QUESTION_LABELS}
                    />
                  </>
                )}
              </AssistantBubble>
            );
          return (
            <Fragment key={message.id}>
              {bubble}
              {/* El paso 1 va tras el saludo: lo encontrado se revisa antes de preguntar. */}
              {index === 0 ? review : null}
            </Fragment>
          );
        })}
        {messages.length === 0 ? review : null}
      </div>

      {thinking ? <AssistantThinking /> : null}
    </div>
  );
});

/**
 * «¿Por qué lo pregunto?», plegado (informe, rec. 5): la pregunta se queda corta
 * y el contexto o el ejemplo están para quien los quiera, sin borrarse.
 */
function Why({ text }: { text: string }) {
  return (
    <details className="group/why mx-4 mb-1 text-[13.5px]">
      <summary className="w-fit cursor-pointer list-none text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        ¿Por qué lo pregunto?
      </summary>
      <p className="mt-1.5 leading-relaxed text-muted-foreground">{text}</p>
    </details>
  );
}

/** Lo que se lee en voz alta: el mensaje y la pregunta, sin repetirla si el mensaje ya la trae. */
function spoken(body: string, question: string): string {
  return body.includes(question) ? body : `${body} ${question}`.trim();
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
