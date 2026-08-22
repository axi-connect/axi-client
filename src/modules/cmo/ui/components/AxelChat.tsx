"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, BarChart3, Flame, Lock, Megaphone, Plus, RotateCcw, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { Button } from "@/shared/components/ui/button";
import { BriefingHero } from "./BriefingHero";
import { CmoBlockedState } from "./CmoBlockedState";
import { ProposalCard } from "./ProposalCard";
import { AxelThinking } from "./AxelThinking";

/**
 * Sugerencias del estado vacío. Son las tres cosas que Axel hace de verdad, en
 * el orden en que un dueño las pediría: primero entender, luego a quién tocar,
 * luego qué armar. Cada una es una frase que él mismo diría — no un comando.
 */
const STARTERS = [
  { icon: BarChart3, label: "¿Cómo vamos?", prompt: "¿Cómo vamos este mes?" },
  {
    icon: Flame,
    label: "Clientes calientes",
    prompt: "¿Quiénes son mis clientes más calientes y por qué?",
  },
  {
    icon: Megaphone,
    label: "Ármame algo",
    prompt: "Ármame una campaña para lo que veas más urgente.",
  },
] as const;

/** Cuántas propuestas entran al hilo. El resto vive en el rail. */
const PROPOSALS_IN_THREAD = 2;

interface AxelChatProps {
  ownerName: string | null;
  briefing: BriefingDTO | null;
  briefingLoading: boolean;
  briefingHour: number;
  /** Propuestas por decidir, ya filtradas por el store. */
  proposals: ProposalDTO[];
  /** Cuando Axel no está disponible, esto ocupa el lugar del hilo. */
  blocked: NonNullable<CmoBlocker> | null;
  canManage: boolean;
}

/**
 * El despacho entero: hero, hilo y composer sobre **un solo campo**.
 *
 * Este componente es el dueño del reparto vertical de la vista, y por eso
 * también del bloqueo: antes `CmoView` devolvía `CmoBlockedState` por su cuenta
 * y esa pantalla se quedaba fuera del campo, sin fondo, como si fuera de otro
 * módulo. Ahora todo lo que ocupa el centro pasa por aquí.
 *
 * Tres decisiones que vienen del diseño y no del componente:
 *
 * - **El hero no desaparece al conversar.** Va al principio del scroller, así que
 *   se va solo al hacer scroll. Antes se cambiaba por el hilo con un ternario, y
 *   eso hacía que el briefing del día se perdiera en cuanto escribías algo.
 * - **El mensaje propio se pinta antes de la respuesta.** El turno tarda
 *   decenas de segundos; sin eco inmediato el usuario escribe dos veces.
 * - **Un turno que falla no pierde el texto.** La burbuja se queda con el
 *   mensaje y un botón de reintentar: volver a teclear una pregunta larga
 *   porque la red falló es la peor forma de perder a alguien.
 */
export function AxelChat({
  ownerName,
  briefing,
  briefingLoading,
  briefingHour,
  proposals,
  blocked,
  canManage,
}: AxelChatProps) {
  const thread = useCmoStore((state) => state.thread);
  const live = useCmoStore((state) => state.live);
  const settled = useCmoStore((state) => state.settled);
  const resolveSettled = useCmoStore((state) => state.resolveSettled);
  const ask = useCmoStore((state) => state.ask);
  const retryLast = useCmoStore((state) => state.retryLast);
  const newThread = useCmoStore((state) => state.newThread);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = thread.messages.length > 0;

  // Autoscroll al fondo en cada mensaje nuevo y al empezar a pensar: si no, la
  // respuesta aparece fuera de la vista y parece que no pasó nada. Con el hilo
  // vacío NO se hace: arrastraría el hero fuera de la pantalla al entrar, que es
  // justo lo primero que hay que leer.
  //
  // `proposals.length` está en las dependencias a propósito: la tarjeta de la
  // propuesta llega DESPUÉS del mensaje (el POST solo trae su id y el tablero se
  // recarga aparte), así que sin este segundo desplazamiento aparecería fuera de
  // la vista justo lo que hay que decidir.
  useEffect(() => {
    if (!hasMessages) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
    // `live?.text.length` mantiene el hilo pegado al fondo mientras Axel escribe:
    // sin esto el texto crecería por debajo del borde visible.
  }, [hasMessages, thread.messages.length, thread.thinking, proposals.length, live?.text.length]);

  const submit = (text: string) => {
    if (text.trim() === "" || thread.thinking) return;
    setDraft("");
    if (textareaRef.current !== null) textareaRef.current.style.height = "auto";
    void ask(text);
  };

  const byId = useMemo(() => new Map(proposals.map((item) => [item.id, item])), [proposals]);

  /* Las propuestas que nacieron EN la conversación se pintan pegadas al mensaje
     que las anuncia, así que no pueden repetirse en el bloque de arriba. Ese
     bloque es el del informe del día: lo que Axel trajo por su cuenta. */
  const anchored = useMemo(
    () =>
      new Set(
        thread.messages
          .map((message) => message.proposal_id)
          .filter((id): id is string => id !== null),
      ),
    [thread.messages],
  );

  /* Una propuesta decidida sale del tablero, y con ella salía de la
     conversación: el mensaje de Axel se quedaba sin rastro de lo que armó. Se
     pide por id para poder seguir pintándola con su estado. */
  useEffect(() => {
    for (const id of anchored) {
      if (!byId.has(id) && !(id in settled)) void resolveSettled(id);
    }
  }, [anchored, byId, settled, resolveSettled]);

  const inThread = proposals
    .filter((proposal) => !anchored.has(proposal.id))
    .slice(0, PROPOSALS_IN_THREAD);
  const shown = inThread.length + [...anchored].filter((id) => byId.has(id)).length;
  const restInRail = proposals.length - shown;
  // Los arranques solo mientras no haya conversación. Cuando ya hay propuestas en
  // el hilo bajan a una fila de píldoras: como tarjetas grandes empujarían las
  // propuestas fuera de la pantalla, que es lo único que hay que decidir hoy.
  const starters = hasMessages ? "none" : inThread.length > 0 ? "compact" : "cards";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sidebar-scroll flex-1 overflow-y-auto px-6 pt-8 pb-2">
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          {blocked !== null ? (
            <CmoBlockedState blocker={blocked} canManage={canManage} />
          ) : (
            <>
              <BriefingHero
                briefing={briefing}
                loading={briefingLoading}
                briefingHour={briefingHour}
                ownerName={ownerName}
                proposalCount={proposals.length}
                busy={thread.thinking}
              />

              {starters === "cards" ? (
                <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-3">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => {
                        submit(starter.prompt);
                      }}
                      disabled={thread.thinking}
                      className={cn(
                        "group flex flex-col gap-2 rounded-lg border border-border p-3.5 text-left",
                        "bg-background/80 backdrop-blur transition-all",
                        "hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-float",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <span className="grid size-[30px] place-items-center rounded-full border border-border/60 bg-secondary text-muted-foreground group-hover:border-accent-violet/30 group-hover:bg-accent-violet/10 group-hover:text-accent-violet">
                        <starter.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="font-heading text-[13.5px] font-bold">{starter.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {starters === "compact" ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => {
                        submit(starter.prompt);
                      }}
                      disabled={thread.thinking}
                      className={cn(
                        "rounded-full border border-border bg-background/80 px-3.5 py-1.5",
                        "text-xs text-muted-foreground backdrop-blur transition-all",
                        "hover:-translate-y-px hover:border-accent-violet/30 hover:text-foreground",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      {starter.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {inThread.length > 0 ? (
                <div className="mt-7 flex flex-col gap-3">
                  {inThread.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} stamped />
                  ))}
                  {restInRail > 0 ? (
                    <p className="text-center text-[10.5px] text-muted-foreground/70">
                      {restInRail === 1
                        ? "Hay 1 propuesta más en el tablero."
                        : `Hay ${String(restInRail)} propuestas más en el tablero.`}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {hasMessages || thread.thinking ? (
                <div className="mt-6 flex flex-col gap-4">
                  {thread.messages.map((message) => {
                    const proposal =
                      message.proposal_id === null
                        ? undefined
                        : (byId.get(message.proposal_id) ??
                          settled[message.proposal_id] ??
                          undefined);
                    return (
                      <Fragment key={message.id}>
                        <MessageBubble message={message} onRetry={retryLast} />
                        {/* La propuesta va DEBAJO del mensaje que la anuncia, no
                            al principio del hilo: con veinte mensajes de
                            conversación, arriba nadie la ve. `fresh` solo en los
                            mensajes de esta sesión (id local): al recargar, la
                            misma tarjeta no debe volver a anunciarse. */}
                        {proposal !== undefined ? (
                          <ProposalCard
                            proposal={proposal}
                            stamped
                            fresh={message.id.startsWith("local-")}
                          />
                        ) : null}
                      </Fragment>
                    );
                  })}
                  {/* Mientras Axel trabaja se ven sus PASOS; en cuanto empieza
                      a escribir, el texto los reemplaza: a partir de ahí lo que
                      importa es lo que dice, no de dónde lo saca. */}
                  {thread.thinking && live?.text ? (
                    <StreamingBubble text={live.text} />
                  ) : thread.thinking ? (
                    <AxelThinking steps={live?.steps ?? []} />
                  ) : null}
                </div>
              ) : null}
            </>
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <div className="flex-none px-6 pt-3 pb-5">
        <div className="mx-auto w-full max-w-[640px]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
            className={cn(
              "rounded-xl border border-border bg-background/90 p-3.5 shadow-float backdrop-blur",
              "focus-within:border-accent-violet/30",
              blocked !== null && "opacity-55",
            )}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                const el = event.target;
                el.style.height = "auto";
                el.style.height = `${String(Math.min(el.scrollHeight, 120))}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              rows={1}
              placeholder="Pregúntale a Axel o dile qué armar…"
              aria-label="Mensaje para Axel"
              disabled={thread.thinking || blocked !== null}
              className="max-h-[120px] min-h-[42px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void newThread();
                }}
                disabled={thread.thinking || !hasMessages || blocked !== null}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Nueva
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={draft.trim() === "" || thread.thinking || blocked !== null}
                className="bg-brand-gradient ml-auto size-9 rounded-full text-primary-foreground"
                aria-label="Enviar"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          {blocked === null ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground/70">
              <Sparkles className="size-3" aria-hidden="true" />
              Axel propone; tú apruebas. Nunca envía nada por su cuenta.
            </p>
          ) : (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-muted-foreground/70">
              <Lock className="size-3 flex-none" aria-hidden="true" />
              {blocked === "quota"
                ? "Sin análisis disponibles. El chat vuelve al empezar el próximo ciclo."
                : "Axel está apagado. Enciéndelo en sus ajustes para volver a conversar."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * La respuesta de Axel mientras se escribe.
 *
 * Es una burbuja aparte y no la de siempre a propósito: este texto NO está
 * guardado en ninguna parte todavía y no tiene id, hora ni traza. Cuando el
 * turno cierra, el mensaje de verdad la reemplaza — con su marca de tiempo y sus
 * fuentes consultadas.
 */
function StreamingBubble({ text }: { text: string }) {
  return (
    <div
      className="self-stretch overflow-hidden rounded-lg border border-border bg-background shadow-float"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3 text-accent-violet" aria-hidden="true" />
        <span className="text-[11px] font-semibold">Axel</span>
        <span className="text-[10.5px] text-muted-foreground/70">escribiendo…</span>
      </div>
      <div className="px-4 pt-2 pb-3.5 text-[13.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
        {text}
        {/* El cursor va DENTRO del párrafo para que siga a la última palabra en
            vez de quedarse anclado a una esquina. */}
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] animate-pulse bg-accent-violet align-baseline"
        />
      </div>
    </div>
  );
}

function MessageBubble({ message, onRetry }: { message: UiMessage; onRetry: () => void }) {
  if (message.role === "owner") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={cn(
            "max-w-[84%] rounded-lg rounded-br-sm border border-border bg-background px-3.5 py-2.5",
            "text-[13.5px] leading-relaxed shadow-float",
            message.pending === true && "opacity-60",
            message.failed !== undefined && "border-destructive/40",
          )}
        >
          {message.body}
        </div>
        {message.failed !== undefined ? (
          <div className="flex items-center gap-2 text-[11px] text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            <span>{message.failed}</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  /**
   * Los mensajes `system` son avisos del módulo (cuota agotada, propuesta
   * vencida), no diálogo: se pintan sin la identidad de Axel para que nadie
   * atribuya al director algo que dijo el sistema.
   */
  if (message.role === "system") {
    return (
      <p className="self-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
        {message.body}
      </p>
    );
  }

  return (
    <div className="self-stretch overflow-hidden rounded-lg border border-border bg-background shadow-float">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" />
        <span className="text-[11.5px] font-bold tracking-wide text-accent-violet">Axel</span>
      </div>
      <div className="px-4 pt-2 pb-3.5 text-[13.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
        {message.body}
      </div>
      {message.tool_calls !== null && message.tool_calls.length > 0 ? (
        <div className="border-t border-border/50 px-4 py-2">
          <p className="text-[10.5px] text-muted-foreground/70">
            Consultó {message.tool_calls.length}{" "}
            {message.tool_calls.length === 1 ? "fuente" : "fuentes"} de tus datos
          </p>
        </div>
      ) : null}
    </div>
  );
}
