"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useAutoScroll } from "@/core/hooks/use-auto-scroll";
import { AlertTriangle, ArrowUp, BarChart3, Flame, Lock, Megaphone, Plus, RotateCcw, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useTypewriterPlaceholder } from "@/modules/cmo/infrastructure/hooks/use-typewriter-placeholder";
import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { Button } from "@/shared/components/ui/button";
import { AxelMarkdown } from "./AxelMarkdown";
import { AxelQuestion } from "./AxelQuestion";
import { BriefingHero } from "./BriefingHero";
import { CmoBlockedState } from "./CmoBlockedState";
import { ProposalCard } from "./ProposalCard";
import { AxelThinking } from "./AxelThinking";

/**
 * Sugerencias del estado vacío. Son las tres cosas que Axel hace de verdad, en
 * el orden en que un dueño las pediría: primero entender, luego a quién tocar,
 * luego qué armar. Cada una es una frase que él mismo diría — no un comando.
 *
 * El `hint` no es decoración: una tarjeta que solo dice «Ármame algo» obliga a
 * adivinar qué va a pasar al tocarla. Tres o cuatro palabras debajo convierten
 * tres botones en un menú que se entiende sin probarlo.
 */
const STARTERS = [
  {
    icon: BarChart3,
    label: "¿Cómo vamos?",
    hint: "Embudo, ventas y qué cambió",
    prompt: "¿Cómo vamos este mes?",
  },
  {
    icon: Flame,
    label: "Clientes calientes",
    hint: "Quién está por comprar",
    prompt: "¿Quiénes son mis clientes más calientes y por qué?",
  },
  {
    icon: Megaphone,
    label: "Ármame algo",
    hint: "Una campaña o una promo",
    prompt: "Ármame una campaña para lo que veas más urgente.",
  },
] as const;

/** Texto de reposo del compositor: SSR, sin JavaScript y cada pausa del efecto. */
const PLACEHOLDER_IDLE = "Pregúntale a Axel o dile qué armar…";

/**
 * Lo que el compositor teclea solo. **Constante de módulo, no un literal en el
 * render**: `useTypewriterPlaceholder` la lleva en las dependencias de su efecto
 * y una referencia nueva por render reiniciaría la frase antes de terminarla.
 *
 * Las seis cubren capacidades DISTINTAS —y tres que las tarjetas de arranque no
 * mencionan (recompra, calidad del agente, calendario)— porque el compositor es
 * lo único que sigue sugiriendo cuando el hilo ya tiene conversación y las
 * tarjetas se han ido.
 */
const PLACEHOLDER_PHRASES = [
  "¿Cómo vamos este mes?",
  "¿Quiénes están por recomprar?",
  "Ármame una promo para el fin de semana",
  "¿Por dónde se me está yendo la plata?",
  "¿Cómo va atendiendo mi agente?",
  "¿Qué fecha comercial viene?",
] as const;

/** Cuántas propuestas entran al hilo. El resto vive en el rail. */
const PROPOSALS_IN_THREAD = 2;

/** Altura máxima del compositor, en px: una sola fuente para la clase y el JS. */
const COMPOSER_MAX_PX = 120;

interface AxelChatProps {
  ownerName: string | null;
  briefing: BriefingDTO | null;
  briefingLoading: boolean;
  /** Error al cargar el briefing: sin él, un 500 se pintaba como «tenant sin
   *  briefing» — una afirmación falsa (F1 de la auditoría). */
  briefingError: string | null;
  onRetryBriefing: () => void;
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
  briefingError,
  onRetryBriefing,
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
  const answer = useCmoStore((state) => state.answer);
  const retryLast = useCmoStore((state) => state.retryLast);
  const newThread = useCmoStore((state) => state.newThread);

  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = thread.messages.length > 0;
  /* Qué pregunta se puede responder. Solo la del último mensaje: con varias
     vivas el dueño podría contestar a una de hace diez mensajes cuya
     conversación ya cambió de rumbo. La posición en el hilo es toda la verdad
     que hace falta — sin columnas extra ni casar textos de respuesta. */
  const lastMessageId = thread.messages.at(-1)?.id ?? null;

  /* El compositor teclea ejemplos mientras está en reposo. Se apaga en cuanto
     hay algo escrito, mientras Axel trabaja y con Axel bloqueado: en esos tres
     casos el campo ya está diciendo algo, o no acepta nada. */
  useTypewriterPlaceholder(textareaRef, {
    phrases: PLACEHOLDER_PHRASES,
    fallback: PLACEHOLDER_IDLE,
    enabled: draft === "" && !thread.thinking && blocked === null,
  });

  // Autoscroll CON guarda de intención (F5 de la auditoría): pegado al fondo
  // sigue el texto que llega; si el usuario subió a leer un mensaje anterior,
  // no se le arrastra. `stickOnMount: false` porque con el hilo vacío el primer
  // scroll se llevaría el hero fuera de pantalla, que es lo primero que hay que
  // leer. `proposals.length` está en las dependencias a propósito: la tarjeta
  // llega DESPUÉS del mensaje (el POST solo trae su id) y hay que mostrarla.
  const { containerRef, bottomRef } = useAutoScroll<HTMLDivElement>({
    deps: [hasMessages, thread.messages.length, thread.thinking, proposals.length, live?.text.length],
    stickOnMount: false,
    behavior: "auto",
  });

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
      <div ref={containerRef} className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-8 pb-2">
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          {blocked !== null ? (
            <CmoBlockedState blocker={blocked} canManage={canManage} />
          ) : (
            <>
              <BriefingHero
                briefing={briefing}
                loading={briefingLoading}
                error={briefingError}
                onRetry={onRetryBriefing}
                briefingHour={briefingHour}
                ownerName={ownerName}
                proposalCount={proposals.length}
                busy={thread.thinking}
              />

              {starters === "none" ? null : <StarterEyebrow />}

              {starters === "cards" ? (
                <div className="mt-4 grid w-full gap-2.5 sm:grid-cols-3">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => {
                        submit(starter.prompt);
                      }}
                      disabled={thread.thinking}
                      className={cn(
                        "group flex flex-col gap-1.5 rounded-lg border border-border p-3.5 text-left",
                        "bg-background/80 backdrop-blur transition-all",
                        "hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-float",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      <span className="mb-0.5 grid size-[30px] place-items-center rounded-full border border-border/60 bg-secondary text-muted-foreground group-hover:border-accent-violet/30 group-hover:bg-accent-violet/10 group-hover:text-accent-violet">
                        <starter.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="font-heading text-[13.5px] font-bold">{starter.label}</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {starter.hint}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {starters === "compact" ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                  {/* role="log": el mensaje FINAL de Axel se inserta aquí y el
                      lector de pantalla lo anuncia. Antes lo único vivo era el
                      borrador en streaming, y la respuesta definitiva no se
                      anunciaba nunca (A1). El borrador queda FUERA del log para
                      no re-anunciar el texto completo en cada delta (A2). */}
                  <div
                    role="log"
                    aria-label="Conversación con Axel"
                    className="flex flex-col gap-4"
                  >
                  {thread.messages.map((message) => {
                    const proposal =
                      message.proposal_id === null
                        ? undefined
                        : (byId.get(message.proposal_id) ??
                          settled[message.proposal_id] ??
                          undefined);
                    return (
                      <Fragment key={message.id}>
                        <MessageBubble
                          message={message}
                          onRetry={retryLast}
                          questionLive={message.id === lastMessageId}
                          busy={thread.thinking}
                          onPick={(label) => {
                            void answer(label);
                          }}
                          onWriteInstead={() => {
                            textareaRef.current?.focus();
                          }}
                        />
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
                  </div>
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

      {/* `axel-composer-glow`: el bloom violeta que hace que el input lea como la
          fuente de luz de la pantalla. Va aquí y no en el form porque tiene que
          derramarse por fuera de sus bordes. */}
      <div className="axel-composer-glow flex-none px-6 pt-3 pb-5">
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
                el.style.height = `${String(Math.min(el.scrollHeight, COMPOSER_MAX_PX))}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              rows={1}
              /* CONSTANTE a propósito: es la invariante de
                 `useTypewriterPlaceholder`. Una prop dinámica aquí haría que
                 cada render de React pisara la frase a medio teclear. */
              placeholder={PLACEHOLDER_IDLE}
              aria-label="Mensaje para Axel"
              disabled={thread.thinking || blocked !== null}
              style={{ maxHeight: COMPOSER_MAX_PX }}
              className="min-h-[42px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
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
 * «Empieza por aquí» sobre las sugerencias.
 *
 * Es la pieza que le faltaba al inicio. Sin ella había tres botones sueltos
 * flotando bajo un párrafo; con ella hay un primer paso declarado, que es lo que
 * un dueño que entra por primera vez necesita que alguien le diga.
 *
 * Las dos reglas son decorativas y se anuncian como tales; el texto no, porque
 * también ordena la lectura para quien usa un lector de pantalla.
 */
function StarterEyebrow() {
  return (
    <div className="mt-8 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-gradient-to-r from-transparent to-border"
      />
      <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
        Empieza por aquí
      </span>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-gradient-to-l from-transparent to-border"
      />
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
      // Sin aria-live a propósito: el contenedor del hilo (role="log") anuncia
      // la respuesta FINAL completa; anunciar además cada delta re-leería el
      // texto entero una y otra vez (A2).
      aria-busy="true"
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3 text-accent-violet" aria-hidden="true" />
        <span className="text-[11px] font-semibold">Axel</span>
        <span className="text-[10.5px] text-muted-foreground/70">escribiendo…</span>
      </div>
      {/* El mismo renderer que el mensaje final, sobre el texto parcial: un `**`
          a medio cerrar se ve como asteriscos por un instante y se resuelve con
          el siguiente delta. Esperar a que el bloque cierre para pintarlo daría
          saltos peores. El cursor va DENTRO del último bloque, siguiendo a la
          última palabra. */}
      <AxelMarkdown text={text} caret className="px-4 pt-2 pb-3.5 text-muted-foreground" />
    </div>
  );
}

function MessageBubble({
  message,
  onRetry,
  questionLive,
  busy,
  onPick,
  onWriteInstead,
}: {
  message: UiMessage;
  onRetry: () => void;
  /** true = es el último mensaje del hilo, así que su pregunta se puede tocar. */
  questionLive: boolean;
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  if (message.role === "owner") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={cn(
            "max-w-[84%] rounded-lg rounded-br-sm border border-border bg-background px-3.5 py-2.5",
            // El texto del dueño se pinta LITERAL, sin interpretar formato: es lo
            // que escribió. `pre-wrap` porque sus saltos de línea se colapsaban,
            // y una pregunta de tres renglones aparecía en uno.
            "text-[13.5px] leading-relaxed whitespace-pre-wrap shadow-float",
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
      {/* Con pregunta, el cuerpo PUEDE venir vacío: el prompt le pide a Axel que
          no la repita en prosa, así que en esos turnos la pregunta es el mensaje.
          Sin esta guarda el renderer pintaría un hueco de padding sobre las
          opciones. */}
      {message.body === "" ? null : (
        <AxelMarkdown text={message.body} className="px-4 pt-2 pb-3.5 text-muted-foreground" />
      )}
      {message.question === null ? null : (
        <AxelQuestion
          question={message.question}
          live={questionLive}
          busy={busy}
          onPick={onPick}
          onWriteInstead={onWriteInstead}
        />
      )}
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
