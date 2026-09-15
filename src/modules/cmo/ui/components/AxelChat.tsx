"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowUp, Lock, RotateCcw, Sparkles } from "lucide-react";

import { useAutoScroll } from "@/core/hooks/use-auto-scroll";
import { cn } from "@/core/lib/utils";
import { cssEase } from "@/core/styles/motion";
import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useDockedHero } from "@/modules/cmo/infrastructure/hooks/use-docked-hero";
import { useTypewriterPlaceholder } from "@/modules/cmo/infrastructure/hooks/use-typewriter-placeholder";
import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { Button } from "@/shared/components/ui/button";
import { AxelDock } from "./AxelDock";
import { AxelMarkdown } from "./AxelMarkdown";
import { AxelQuestion } from "./AxelQuestion";
import { AxelThinking } from "./AxelThinking";
import { BriefingHero } from "./BriefingHero";
import { CmoActions } from "./CmoActions";
import { CmoBlockedState } from "./CmoBlockedState";
import { ProposalCard } from "./ProposalCard";
import { StarterPills } from "./StarterPills";

/** Texto de reposo del compositor: SSR, sin JavaScript y cada pausa del efecto. */
const PLACEHOLDER_IDLE = "Pregúntale a Axel…";

/**
 * Lo que el compositor teclea solo. **Constante de módulo, no un literal en el
 * render**: `useTypewriterPlaceholder` la lleva en las dependencias de su efecto
 * y una referencia nueva por render reiniciaría la frase antes de terminarla.
 *
 * Cuatro, y ninguna repite lo que ya dicen las píldoras: el compositor es lo
 * único que sigue sugiriendo cuando el hilo ya tiene conversación.
 */
const PLACEHOLDER_PHRASES = [
  "¿Quiénes están por recomprar?",
  "¿Por dónde se me va la plata?",
  "¿Cómo va mi agente?",
  "¿Qué fecha comercial viene?",
] as const;

/** Cuántas propuestas del informe entran al hilo. El resto vive en el rail. */
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
 * El despacho entero: la barra de Axel, el hilo y el compositor sobre **un solo
 * campo**. Este componente es el dueño del reparto vertical de la vista.
 *
 * Tres decisiones de diseño (2026-09-15) que explican la forma que tiene:
 *
 * - **Axel no se pierde al bajar.** Vive en `AxelDock`, una barra sticky dentro
 *   del scroller: al pasar el centinela, `useDockedHero` marca `data-docked` y
 *   el CSS lo acopla a 40 px con un `transform`. Una sola instancia, siempre.
 * - **El compositor empieza centrado y baja al primer mensaje.** Con `data-empty`
 *   la raíz centra el conjunto (Axel, saludo, campo, píldoras); al llegar la
 *   conversación vuelve a `[scroller][compositor]`. El `<form>` es el mismo nodo
 *   en los dos estados —conserva el foco y el placeholder tecleado— y el viaje es
 *   un FLIP único de `transform` (`useComposerFlip`), no una animación de layout.
 * - **Menos texto.** Tres píldoras sin pista, una sola promesa de confianza bajo
 *   el compositor, y la fecha en la barra. Lo que se quitó está en
 *   `docs/plans/cmo_despacho_minimalista_plan.md` §6.
 *
 * Y dos que vienen de antes: el mensaje propio se pinta antes de la respuesta
 * (el turno tarda decenas de segundos) y un turno que falla no pierde el texto.
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

  const [draft, setDraft] = useState("");
  /* Axel «escucha» cuando el dueño le está escribiendo: foco en el compositor
     o borrador sin enviar. Es estado local de UI, no del store. */
  const [composerFocused, setComposerFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const hasMessages = thread.messages.length > 0;
  /* Qué pregunta se puede responder. Solo la del último mensaje: con varias
     vivas el dueño podría contestar a una de hace diez mensajes cuya
     conversación ya cambió de rumbo. */
  const lastMessageId = thread.messages.at(-1)?.id ?? null;
  /** Sin conversación y sin bloqueo: el conjunto se centra y hay píldoras. */
  const isEmpty = !hasMessages && !thread.thinking && blocked === null;

  useTypewriterPlaceholder(textareaRef, {
    phrases: PLACEHOLDER_PHRASES,
    fallback: PLACEHOLDER_IDLE,
    enabled: draft === "" && !thread.thinking && blocked === null,
  });

  // Autoscroll CON guarda de intención (F5 de la auditoría): pegado al fondo
  // sigue el texto que llega; si el usuario subió a leer, no se le arrastra.
  // `stickOnMount: false` porque con el hilo vacío el primer scroll se llevaría
  // el hero fuera de pantalla. `proposals.length` está a propósito: la tarjeta
  // llega DESPUÉS del mensaje (el POST solo trae su id).
  const { containerRef, bottomRef } = useAutoScroll<HTMLDivElement>({
    deps: [hasMessages, thread.messages.length, thread.thinking, proposals.length, live?.text.length],
    stickOnMount: false,
    behavior: "auto",
  });

  useDockedHero(rootRef, containerRef, sentinelRef, { enabled: blocked === null && !isEmpty });
  useComposerFlip(composerRef, isEmpty);

  const submit = (text: string) => {
    if (text.trim() === "" || thread.thinking) return;
    setDraft("");
    if (textareaRef.current !== null) textareaRef.current.style.height = "auto";
    void ask(text);
  };

  const byId = useMemo(() => new Map(proposals.map((item) => [item.id, item])), [proposals]);

  /* Las propuestas que nacieron EN la conversación se pintan pegadas al mensaje
     que las anuncia, así que no pueden repetirse en el bloque del informe. */
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
     conversación. Se pide por id para poder seguir pintándola con su estado. */
  useEffect(() => {
    for (const id of anchored) {
      if (!byId.has(id) && !(id in settled)) void resolveSettled(id);
    }
  }, [anchored, byId, settled, resolveSettled]);

  const inThread = proposals
    .filter((proposal) => !anchored.has(proposal.id))
    .slice(0, PROPOSALS_IN_THREAD);

  return (
    <div
      ref={rootRef}
      data-empty={isEmpty ? "" : undefined}
      className="axel-chat relative flex min-h-0 flex-1 flex-col"
    >
      {blocked === null ? <CmoActions className="absolute top-2.5 right-3 z-30" /> : null}

      <div ref={containerRef} className="sidebar-scroll axel-scroller min-h-0 flex-1 overflow-y-auto px-6 pb-2">
        <div className="mx-auto flex w-full max-w-[640px] flex-col">
          {blocked !== null ? (
            <CmoBlockedState blocker={blocked} canManage={canManage} />
          ) : (
            <>
              <AxelDock ownerTyping={composerFocused || draft.trim() !== ""} />
              {/* Reserva para Axel colgando de la barra, y el centinela que decide el acople. */}
              <div className="axel-hero-spacer" aria-hidden="true" />
              <div ref={sentinelRef} className="h-px" aria-hidden="true" />

              <BriefingHero
                briefing={briefing}
                loading={briefingLoading}
                error={briefingError}
                onRetry={onRetryBriefing}
                briefingHour={briefingHour}
                ownerName={ownerName}
                proposalCount={proposals.length}
              />

              {inThread.length > 0 ? (
                <div className="mt-6 flex flex-col gap-3">
                  {inThread.map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
                </div>
              ) : null}

              {hasMessages || thread.thinking ? (
                <div className="mt-6 flex flex-col gap-4">
                  {/* role="log": el mensaje FINAL de Axel se inserta aquí y el
                      lector de pantalla lo anuncia (A1). El borrador queda FUERA
                      del log para no re-anunciar el texto en cada delta (A2). */}
                  <div role="log" aria-label="Conversación con Axel" className="flex flex-col gap-4">
                    {thread.messages.map((message) => {
                      const proposal =
                        message.proposal_id === null
                          ? undefined
                          : (byId.get(message.proposal_id) ?? settled[message.proposal_id] ?? undefined);
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
                          {/* La propuesta va DEBAJO del mensaje que la anuncia.
                              `fresh` solo en los mensajes de esta sesión (id
                              local): al recargar no debe volver a anunciarse. */}
                          {proposal !== undefined ? (
                            <ProposalCard proposal={proposal} fresh={message.id.startsWith("local-")} />
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </div>
                  {/* Mientras Axel trabaja se ven sus PASOS; en cuanto empieza
                      a escribir, el texto los reemplaza. */}
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
          fuente de luz de la pantalla. */}
      <div ref={composerRef} className="axel-composer-glow flex-none px-6 pt-3 pb-5">
        <div className="mx-auto w-full max-w-[640px]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
            className={cn(
              "rounded-2xl border border-border bg-background/90 p-3.5 shadow-float backdrop-blur",
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
              onFocus={() => {
                setComposerFocused(true);
              }}
              onBlur={() => {
                setComposerFocused(false);
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
            <div className="mt-1 flex items-center justify-end">
              <Button
                type="submit"
                size="icon"
                disabled={draft.trim() === "" || thread.thinking || blocked !== null}
                className="bg-brand-gradient size-9 rounded-full text-primary-foreground"
                aria-label="Enviar"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          {isEmpty ? <StarterPills onPick={submit} disabled={thread.thinking} className="mt-3" /> : null}

          {blocked === null ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-foreground/70">
              <Sparkles className="size-3" aria-hidden="true" />
              Nada sale sin tu aprobación.
            </p>
          ) : (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-muted-foreground/70">
              <Lock className="size-3 flex-none" aria-hidden="true" />
              {blocked === "quota" ? "Sin análisis hasta el próximo ciclo." : "Axel está apagado."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * El viaje del compositor del centro al pie, UNA vez, al primer mensaje.
 *
 * Se mide su posición mientras la vista está vacía (una lectura de layout por
 * render, y solo en ese estado); en el render que deja de estarlo se mide de
 * nuevo y la diferencia se anima con `transform` vía WAAPI. No se anima el
 * layout: React ya lo cambió de golpe, y el navegador solo interpola un
 * `translateY`. Sin `animate` (jsdom) o con movimiento reducido, salto directo.
 */
function useComposerFlip(ref: RefObject<HTMLDivElement | null>, isEmpty: boolean): void {
  const reduced: boolean | null = useReducedMotion();
  const lastTop = useRef<number | null>(null);
  const wasEmpty = useRef(isEmpty);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (isEmpty) {
      lastTop.current = el.getBoundingClientRect().top;
    } else if (wasEmpty.current && lastTop.current !== null) {
      const dy = lastTop.current - el.getBoundingClientRect().top;
      lastTop.current = null;
      if (reduced !== true && Math.abs(dy) > 1 && typeof el.animate === "function") {
        el.animate([{ transform: `translateY(${String(dy)}px)` }, { transform: "translateY(0)" }], {
          duration: 420,
          easing: cssEase.fallback,
        });
      }
    }
    wasEmpty.current = isEmpty;
  }, [ref, isEmpty, reduced]);
}

/**
 * La respuesta de Axel mientras se escribe. Es una burbuja aparte a propósito:
 * este texto NO está guardado todavía y no tiene id, hora ni traza. Cuando el
 * turno cierra, el mensaje de verdad la reemplaza.
 */
function StreamingBubble({ text }: { text: string }) {
  return (
    <div
      className="self-stretch overflow-hidden rounded-lg border border-border bg-background shadow-float"
      // Sin aria-live a propósito: el `role="log"` anuncia la respuesta FINAL;
      // anunciar además cada delta re-leería el texto entero una y otra vez (A2).
      aria-busy="true"
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3 text-accent-violet" aria-hidden="true" />
        <span className="text-[11px] font-semibold">Axel</span>
        <span className="text-[10.5px] text-muted-foreground/70">escribiendo…</span>
      </div>
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
            // El texto del dueño se pinta LITERAL, con sus saltos de línea.
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

  /* Los mensajes `system` son avisos del módulo, no diálogo: sin la identidad
     de Axel para que nadie atribuya al director algo que dijo el sistema. */
  if (message.role === "system") {
    return (
      <p className="self-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
        {message.body}
      </p>
    );
  }

  const sources = message.tool_calls?.length ?? 0;

  return (
    <div className="self-stretch overflow-hidden rounded-lg border border-border bg-background shadow-float">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" />
        <span className="text-[11.5px] font-bold tracking-wide text-accent-violet">Axel</span>
        {/* La traza de herramientas, en un chip: cuántas lecturas hizo. */}
        {sources > 0 ? (
          <span className="ml-auto rounded-full border border-border/60 px-2 py-px text-[10px] text-muted-foreground/80 tabular-nums">
            {sources} {sources === 1 ? "fuente" : "fuentes"}
          </span>
        ) : null}
      </div>
      {/* Con pregunta, el cuerpo PUEDE venir vacío: en esos turnos la pregunta
          es el mensaje, y el renderer pintaría un hueco. */}
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
    </div>
  );
}
