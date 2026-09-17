"use client";

import { useEffect, useRef } from "react";
import { Check, Mic, RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { IntakeMessage } from "@/modules/intake/domain/intake";
import { AlbaMark } from "./AlbaMark";
import { SetupQuestion } from "./SetupQuestion";

type UiMessage = IntakeMessage & { pending?: boolean; failed?: boolean };

/**
 * El hilo de la conversación.
 *
 * Tres decisiones de lectura:
 *
 * 1. **Solo la última pregunta está viva.** Se resuelve por posición en el
 *    hilo, sin ninguna columna: con varias vivas alguien podría responder a una
 *    pregunta de hace diez mensajes cuya conversación ya cambió de rumbo.
 * 2. **Las pastillas de lo capturado van BAJO el mensaje que las capturó.** Es
 *    lo que hace visible que el asistente entendió, y en el acto: si entendió
 *    mal, se ve en el momento y se corrige hablando.
 * 3. **El autoscroll solo sigue si ya estabas abajo.** Arrastrar a alguien que
 *    está releyendo algo de más arriba es de las cosas más molestas que puede
 *    hacer un chat.
 */
export function SetupChat({
  messages,
  assistantName,
  thinking,
  turnError,
  onPick,
  onWriteInstead,
  onRetry,
}: {
  messages: UiMessage[];
  assistantName: string;
  thinking: boolean;
  turnError: string | null;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
  onRetry: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stuckToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el === null || !stuckToBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const lastQuestionId = [...messages]
    .reverse()
    .find((message) => message.question !== null)?.id;

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        stuckToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="mx-auto flex max-w-[640px] flex-col gap-4" role="log" aria-live="polite">
        {messages.map((message) =>
          message.role === "client" ? (
            <ClientBubble key={message.id} message={message} onRetry={onRetry} />
          ) : (
            <AssistantBubble
              key={message.id}
              message={message}
              assistantName={assistantName}
              questionLive={message.id === lastQuestionId}
              busy={thinking}
              onPick={onPick}
              onWriteInstead={onWriteInstead}
            />
          ),
        )}

        {thinking ? <Thinking assistantName={assistantName} /> : null}

        {turnError === null ? null : (
          <p className="self-center text-center text-[11.5px] text-muted-foreground">
            {turnError}
          </p>
        )}
      </div>
    </div>
  );
}

function ClientBubble({ message, onRetry }: { message: UiMessage; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          "max-w-[85%] rounded-xl rounded-br-sm border border-border bg-secondary/60 px-3.5 py-2.5",
          "text-[14px] leading-relaxed whitespace-pre-wrap shadow-float wrap-anywhere",
          message.pending === true && "opacity-60",
          message.failed === true && "border-destructive/40",
        )}
      >
        {message.body}
      </div>

      {message.voice ? (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Mic className="size-2.5" aria-hidden="true" />
          Dictado
        </p>
      ) : null}

      {message.failed === true ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 text-[11px] text-destructive underline-offset-2 hover:underline"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          No salió. Reintentar
        </button>
      ) : null}
    </div>
  );
}

function AssistantBubble({
  message,
  assistantName,
  questionLive,
  busy,
  onPick,
  onWriteInstead,
}: {
  message: UiMessage;
  assistantName: string;
  questionLive: boolean;
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  return (
    <div className="flex gap-2.5">
      <AlbaMark size={26} className="mt-0.5 flex-none" />

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground/80">{assistantName}</p>

        {message.body === "" ? null : (
          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-foreground wrap-anywhere">
            {message.body}
          </p>
        )}

        {message.captured.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {message.captured.map((item) => (
              <li
                key={item.code}
                className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/8 px-2 py-0.5 text-[10.5px] text-success"
              >
                <Check className="size-2.5" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}

        {message.question === null ? null : (
          <SetupQuestion
            question={message.question}
            live={questionLive}
            busy={busy}
            onPick={onPick}
            onWriteInstead={onWriteInstead}
          />
        )}
      </div>
    </div>
  );
}

function Thinking({ assistantName }: { assistantName: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <AlbaMark size={26} busy className="flex-none" />
      <p className="text-[12.5px] text-muted-foreground/70">
        {assistantName} está pensando
        <span className="intake-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </p>
    </div>
  );
}
