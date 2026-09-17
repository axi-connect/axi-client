"use client";

import { useEffect, useRef } from "react";
import { Check, Mic, RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { IntakeMessage } from "@/modules/intake/domain/intake";
import { SetupQuestion } from "./SetupQuestion";

type UiMessage = IntakeMessage & { pending?: boolean; failed?: boolean };

/**
 * El hilo de la conversación, con el lenguaje de Messages.
 *
 * Burbujas del asistente blancas y a la izquierda con la esquina inferior
 * izquierda recogida; las de la persona a la derecha, en el coral de marca en
 * gradiente — el coral ocupa aquí el sitio que en iOS ocupa el azul: es *el*
 * color de acción. Sin avatar en cada mensaje: el orbe vive en la cabecera y
 * la posición ya dice quién habla.
 *
 * Tres decisiones de lectura:
 *
 * 1. **Solo la última pregunta está viva.** Se resuelve por posición en el
 *    hilo, sin ninguna columna: con varias vivas alguien podría responder a una
 *    pregunta de hace diez mensajes cuya conversación ya cambió de rumbo.
 * 2. **Lo capturado es UNA línea tranquila bajo la burbuja** —«✓ Anotado ·
 *    Horario · Ciudad»— como el «Entregado» de Messages, no tres pastillas
 *    gritando. Sigue haciendo lo que importa: si el asistente entendió mal, se
 *    ve en el acto y se corrige hablando.
 * 3. **El autoscroll solo sigue si ya estabas abajo.** Arrastrar a alguien que
 *    está releyendo algo de más arriba es de lo más molesto que hace un chat.
 */
export function SetupChat({
  messages,
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

  const lastQuestionId = [...messages].reverse().find((message) => message.question !== null)?.id;

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        stuckToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      // El compositor flota encima: el padding inferior es el hueco que deja.
      className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-[120px]"
    >
      <div className="mx-auto flex max-w-[640px] flex-col gap-3.5" role="log" aria-live="polite">
        {messages.map((message) =>
          message.role === "client" ? (
            <ClientBubble key={message.id} message={message} onRetry={onRetry} />
          ) : (
            <AssistantBubble
              key={message.id}
              message={message}
              questionLive={message.id === lastQuestionId}
              busy={thinking}
              onPick={onPick}
              onWriteInstead={onWriteInstead}
            />
          ),
        )}

        {thinking ? <Thinking /> : null}

        {turnError === null ? null : (
          <p className="self-center px-4 text-center text-[12px] text-muted-foreground">{turnError}</p>
        )}
      </div>
    </div>
  );
}

function ClientBubble({ message, onRetry }: { message: UiMessage; onRetry: () => void }) {
  return (
    <div className="intake-rise flex flex-col items-end gap-1.5">
      <div
        className={cn(
          "intake-bubble-me max-w-[82%] rounded-[22px] rounded-br-[6px] px-4 py-3",
          "text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere",
          message.pending === true && "opacity-60",
          message.failed === true && "ring-2 ring-destructive/40",
        )}
      >
        {message.body}
      </div>

      {message.voice ? (
        <p className="flex items-center gap-1 px-1.5 text-[11.5px] text-muted-foreground/70">
          <Mic className="size-[11px]" aria-hidden="true" />
          Dictado
        </p>
      ) : null}

      {message.failed === true ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 px-1.5 text-[12.5px] font-medium text-destructive transition-opacity active:opacity-60"
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
  questionLive,
  busy,
  onPick,
  onWriteInstead,
}: {
  message: UiMessage;
  questionLive: boolean;
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  return (
    <div className="intake-rise flex flex-col items-start gap-1.5">
      {message.body === "" ? null : (
        <div className="intake-card max-w-[82%] rounded-[22px] rounded-bl-[6px] px-4 py-3 text-[15px] leading-relaxed font-light whitespace-pre-wrap text-foreground wrap-anywhere">
          {message.body}
        </div>
      )}

      {message.captured.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-1.5 px-1.5 text-[12px] text-success">
          <Check className="size-[13px] [stroke-width:2.6]" aria-hidden="true" />
          <span className="font-medium">Anotado</span>
          {message.captured.map((item) => (
            <span key={item.code} className="before:mr-1.5 before:text-muted-foreground/60 before:content-['·']">
              {item.label}
            </span>
          ))}
        </p>
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
  );
}

function Thinking() {
  return (
    <div className="intake-rise flex items-start">
      <div
        className="intake-card intake-dots rounded-[22px] rounded-bl-[6px] px-[18px] py-[15px] text-muted-foreground/70"
        aria-label="Está pensando"
      >
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
