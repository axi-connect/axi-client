"use client";

/**
 * Transcript de la sesión como chat de WhatsApp: el operador (cliente
 * simulado) a la izquierda, el agente a la derecha con sus opciones TOCABLES
 * —solo en el último mensaje saliente con opciones y mientras la sesión
 * acepte mensajes—, la elección del operador como chip, la ubicación como
 * tarjeta y «escribiendo…» mientras el pipeline procesa el turno.
 */
import { useEffect } from "react";
import { Check, ChevronRight, MousePointerClick } from "lucide-react";
import { useAutoScroll } from "@/core/hooks/use-auto-scroll";
import { cn } from "@/core/lib/utils";
import {
  lastTappableMessageId,
  type SessionDetail,
  type SessionInteractiveOption,
  type SessionMessage,
} from "../../../../../domain/quality-sessions";
import { bubbleSideFor, ChatBubble, LocationBubble, TypingBubble } from "../../shared/ChatBubble";

type SessionTranscriptProps = {
  session: SessionDetail;
  transcript: SessionMessage[];
  canTap: boolean;
  onTap: (option: SessionInteractiveOption, options: SessionInteractiveOption[]) => void;
  pendingTapId?: string | null;
};

export function SessionTranscript({ session, transcript, canTap, onTap, pendingTapId }: SessionTranscriptProps) {
  const { containerRef, bottomRef, scrollToBottom, isNearBottom } = useAutoScroll<HTMLDivElement>({
    deps: [transcript.length, session.agent_state],
  });
  useEffect(() => {
    if (isNearBottom) scrollToBottom();
  }, [transcript.length, session.agent_state, isNearBottom, scrollToBottom]);

  const agentNames = new Map(session.agents.map((agent) => [agent.id, agent.name]));
  const pinnedName = session.agent?.name ?? "Agente";
  const tappableId = lastTappableMessageId(transcript);
  // Ids ya elegidos: para pintar el «check» en la opción tocada
  const chosen = new Set(
    transcript.flatMap((message) => (message.interactive_reply ? [message.interactive_reply.id] : [])),
  );

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bg-secondary/45 p-4">
      {transcript.length === 0 && session.agent_state !== "thinking" && (
        <p className="mx-auto max-w-sm rounded-full border border-border bg-background px-3 py-1 text-center text-xs text-muted-foreground">
          Sesión creada · agente fijado: {pinnedName}. Escribe como lo haría el cliente.
        </p>
      )}
      <ol className="space-y-2.5">
        {transcript.map((message) => {
          const side = bubbleSideFor(message);
          const agentName = message.agent_id ? agentNames.get(message.agent_id) ?? "Agente" : pinnedName;
          const sender =
            side === "agent"
              ? `${agentName} · agente`
              : side === "customer"
                ? "Operador · cliente simulado"
                : message.sender_type === "system"
                  ? "Sistema"
                  : "Operador humano";
          const foreign = side === "agent" && message.agent_id !== null && session.agent !== null && message.agent_id !== session.agent.id;
          const tappable = canTap && message.id === tappableId && message.interactive !== null;
          return (
            <ChatBubble
              key={message.id}
              side={side}
              sender={foreign ? `${sender} · otro agente` : sender}
              body={message.interactive_reply ? null : message.body}
              createdAt={message.created_at}
              status={message.status}
              className={foreign ? "ring-1 ring-warning/50" : undefined}
            >
              {message.interactive_reply && (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">
                  <MousePointerClick aria-hidden="true" className="size-3 text-accent-violet" />
                  {message.interactive_reply.title}
                  <span className="font-mono text-[10px] text-muted-foreground">{message.interactive_reply.id}</span>
                </p>
              )}
              {message.location && <LocationBubble {...message.location} />}
              {message.interactive && message.interactive.options.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5" aria-label="Opciones del agente">
                  {message.interactive.options.map((option) => {
                    const picked = chosen.has(option.id);
                    const busy = pendingTapId === option.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          disabled={!tappable || busy}
                          onClick={() => onTap(option, message.interactive?.options ?? [])}
                          className={cn(
                            "flex h-8.5 w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-background px-3 text-left text-sm font-medium transition-colors",
                            tappable && !busy && "hover:bg-secondary active:scale-[.98]",
                            !tappable && "opacity-60",
                            picked && "border-brand bg-accent",
                          )}
                        >
                          <span className="min-w-0 truncate">
                            {option.title}
                            {option.description && (
                              <span className="ml-1.5 font-normal text-muted-foreground">{option.description}</span>
                            )}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{option.id}</span>
                            {picked ? (
                              <Check aria-hidden="true" className="size-3.5 text-brand" />
                            ) : (
                              <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ChatBubble>
          );
        })}
        {session.agent_state === "thinking" && <TypingBubble sender={`${pinnedName} · agente`} />}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
