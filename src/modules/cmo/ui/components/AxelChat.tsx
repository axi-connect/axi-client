"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { BarChart3, BookOpen, Calculator, Check, Flame, Lock, Megaphone, Send } from "lucide-react";

import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useAxelIsland } from "@/modules/cmo/infrastructure/hooks/use-axel-island";
import { getLatestBriefing } from "@/modules/cmo/infrastructure/services/cmo-service.adapter";
import {
  useCmoStore,
  type CmoBlocker,
  type LiveStep,
  type UiMessage,
} from "@/modules/cmo/infrastructure/stores/cmo.store";
import {
  AssistantBubble,
  AssistantChatShell,
  AssistantComposer,
  AssistantDock,
  AssistantIslandActivity,
  AssistantMark,
  AssistantQuestion,
  AssistantThinking,
  StarterPills,
  SystemNote,
  UserBubble,
  useInView,
  useTodayLabel,
  type AssistantActivityChip,
  type AssistantStarter,
} from "@/shared/components/features/assistant";
import { AxelHeroAvatar } from "./AxelHeroAvatar";
import { BriefingHero } from "./BriefingHero";
import { CmoActions } from "./CmoActions";
import { CmoBlockedState } from "./CmoBlockedState";
import { ProposalCard } from "./ProposalCard";

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

/**
 * Las tres cosas que Axel hace de verdad, en el orden en que un dueño las
 * pediría: primero entender, luego a quién tocar, luego qué armar.
 */
export const STARTERS: readonly AssistantStarter[] = [
  { icon: BarChart3, label: "¿Cómo vamos?", prompt: "¿Cómo vamos este mes?" },
  { icon: Flame, label: "Clientes calientes", prompt: "¿Quiénes son mis clientes más calientes y por qué?" },
  { icon: Megaphone, label: "Ármame una campaña", prompt: "Ármame una campaña para lo que veas más urgente." },
];

/** Fases del respaldo mientras Axel trabaja sin socket, en el orden en que el runtime las suele recorrer. */
const THINKING_PHASES = ["Revisando tus números…", "Armando la recomendación…", "Ya casi…"] as const;

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
  /** La carga inicial aún no decidió qué pantalla toca: el chat espera invisible. */
  settling?: boolean;
  /** «Ver propuestas» desde la isla: el tablero (el panel superpuesto bajo xl). */
  onOpenBoard?: () => void;
  /** «Ver» de una propuesta nueva desde la isla. */
  onOpenProposal?: (proposalId: string) => void;
}

/**
 * El despacho de Axel, compuesto con el kit de asistente
 * (`shared/components/features/assistant`). Lo que queda aquí es lo que solo
 * el CMO sabe: el store, el informe, las propuestas ancladas al hilo, las
 * píldoras y el copy.
 *
 * Dos reglas que vienen de antes y siguen vivas: el mensaje propio se pinta
 * antes de la respuesta (el turno tarda decenas de segundos) y un turno que
 * falla no pierde el texto.
 *
 * **Rendimiento (2026-09-28): un fragmento del streaming no repinta el hilo.**
 * Este componente ya no suscribe `live`: solo sabe SI hay texto en vivo. El
 * borrador (`LiveBubble`) y los pasos de la isla (`AxelIslandSteps`) llevan su
 * propia suscripción, y las burbujas asentadas y las tarjetas son `memo` con
 * callbacks estables. El avatar tampoco, por `AxelHeroAvatar`.
 *
 * Las propuestas del informe viven en el panel «Por decidir» (dirección A del
 * lienzo): el hero solo las cuenta y el hilo solo pinta las que nacieron en la
 * conversación, debajo del mensaje que las anuncia.
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
  settling = false,
  onOpenBoard,
  onOpenProposal,
}: AxelChatProps) {
  const thread = useCmoStore((state) => state.thread);
  /* Solo SI hay texto en vivo, no el texto: un booleano cambia dos veces por
     turno, el texto cambia en cada fragmento. */
  const writing = useCmoStore((state) => state.live !== null && state.live.text !== "");
  const settled = useCmoStore((state) => state.settled);
  const resolveSettled = useCmoStore((state) => state.resolveSettled);
  const ask = useCmoStore((state) => state.ask);
  const answer = useCmoStore((state) => state.answer);
  const retryLast = useCmoStore((state) => state.retryLast);

  /* Axel «escucha» cuando el dueño le está escribiendo: foco en el compositor
     o borrador sin enviar. Es estado local de UI, no del store. */
  const [ownerTyping, setOwnerTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const today = useTodayLabel();

  const hasMessages = thread.messages.length > 0;
  /* Qué pregunta se puede responder. Solo la del último mensaje: con varias
     vivas el dueño podría contestar a una de hace diez mensajes cuya
     conversación ya cambió de rumbo. */
  const lastMessageId = thread.messages.at(-1)?.id ?? null;
  /** Sin conversación y sin bloqueo: el conjunto se centra y hay píldoras. */
  const isEmpty = !hasMessages && !thread.thinking && blocked === null;

  const submit = (text: string) => {
    if (text.trim() === "" || thread.thinking) return;
    void ask(text);
  };

  /* Callbacks estables: son props de `MessageBubble` y `ProposalCard`, que son
     `memo`. Una función nueva por render los repintaría a todos. */
  const onPick = useCallback(
    (label: string) => {
      void answer(label);
    },
    [answer],
  );
  const onWriteInstead = useCallback(() => {
    textareaRef.current?.focus();
  }, []);
  const onAsk = useCallback(
    (proposal: ProposalDTO) => {
      void ask(`¿Por qué me propones «${proposal.title}» ahora?`);
    },
    [ask],
  );

  /* La isla (island-live F4): los avisos del socket, el resumen del informe y
     la pregunta viva cuando su burbuja no se ve. */
  const news = useCmoStore((state) => state.news);
  const takeNews = useCmoStore((state) => state.takeNews);
  const [liveEl, setLiveEl] = useState<HTMLDivElement | null>(null);
  const liveInView = useInView(liveEl, { rootMargin: "-72px 0px 0px 0px", threshold: 0.3 });
  const lastMessage = thread.messages.at(-1);
  const liveQuestion =
    lastMessage !== undefined && lastMessage.role === "axel" && lastMessage.question !== null
      ? { id: lastMessage.id, question: lastMessage.question }
      : null;
  const openBoard = useCallback(() => {
    onOpenBoard?.();
  }, [onOpenBoard]);
  const openProposal = useCallback(
    (proposalId: string) => {
      onOpenProposal?.(proposalId);
    },
    [onOpenProposal],
  );
  const island = useAxelIsland({
    news,
    takeNews,
    briefing,
    loadBriefing: getLatestBriefing,
    liveQuestion,
    liveVisible: liveInView,
    thinking: thread.thinking,
    empty: isEmpty,
    onPick,
    onWrite: onWriteInstead,
    onOpenBoard: openBoard,
    onOpenProposal: openProposal,
  });

  const byId = useMemo(() => new Map(proposals.map((item) => [item.id, item])), [proposals]);

  /* Las propuestas que nacieron EN la conversación se pintan pegadas al mensaje
     que las anuncia, así que no pueden repetirse en el bloque del informe. */
  const anchored = useMemo(
    () =>
      new Set(thread.messages.map((message) => message.proposal_id).filter((id): id is string => id !== null)),
    [thread.messages],
  );

  /* Una propuesta decidida sale del tablero, y con ella salía de la
     conversación. Se pide por id para poder seguir pintándola con su estado. */
  useEffect(() => {
    for (const id of anchored) {
      if (!byId.has(id) && !(id in settled)) void resolveSettled(id);
    }
  }, [anchored, byId, settled, resolveSettled]);

  const composer = (
    <AssistantComposer
      onSend={submit}
      busy={thread.thinking}
      disabled={blocked !== null}
      dimmed={blocked !== null}
      placeholder={PLACEHOLDER_IDLE}
      placeholderPhrases={PLACEHOLDER_PHRASES}
      ariaLabel="Mensaje para Axel"
      textareaRef={textareaRef}
      onTypingChange={setOwnerTyping}
      after={isEmpty ? <StarterPills starters={STARTERS} onPick={submit} disabled={thread.thinking} className="mt-3" /> : null}
      footer={
        blocked === null ? (
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <AssistantMark size="sm" />
            Nada sale sin tu aprobación.
          </p>
        ) : (
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/80">
            <Lock className="size-3 flex-none" aria-hidden="true" />
            {blocked === "quota" ? "Sin análisis hasta el próximo ciclo." : "Axel está apagado."}
          </p>
        )
      }
    />
  );

  return (
    <AssistantChatShell
      empty={isEmpty}
      className={settling ? "invisible" : undefined}
      dock={
        blocked === null ? (
          <AssistantDock
            title="Axel"
            hero={<AxelHeroAvatar ownerTyping={ownerTyping} />}
            meta={today}
            working={thread.thinking && !writing}
            activity={<AxelIslandSteps />}
            empty={isEmpty}
            item={island.current}
            pending={island.pending}
            onFold={island.fold}
            onExpand={island.expand}
            onDismiss={island.dismiss}
          />
        ) : undefined
      }
      actions={blocked === null ? <CmoActions /> : undefined}
      hero={
        blocked === null ? (
          <BriefingHero
            briefing={briefing}
            loading={briefingLoading}
            error={briefingError}
            onRetry={onRetryBriefing}
            briefingHour={briefingHour}
            ownerName={ownerName}
            proposalCount={proposals.length}
          />
        ) : undefined
      }
      composer={composer}
      autoScrollDeps={[hasMessages, thread.messages.length, thread.thinking, proposals.length, writing]}
    >
      {blocked !== null ? (
        <CmoBlockedState blocker={blocked} canManage={canManage} />
      ) : hasMessages || thread.thinking ? (
        <div className="mt-6 flex flex-col gap-4">
          {/* role="log": el mensaje FINAL de Axel se inserta aquí y el lector de
              pantalla lo anuncia (A1). El borrador queda FUERA del log para no
              re-anunciar el texto en cada delta (A2). */}
          <div role="log" aria-label="Conversación con Axel" className="flex flex-col gap-4">
            {thread.messages.map((message) => {
              const proposal =
                message.proposal_id === null
                  ? undefined
                  : (byId.get(message.proposal_id) ?? settled[message.proposal_id] ?? undefined);
              const fresh = message.id.startsWith("local-");
              return (
                <Fragment key={message.id}>
                  <MessageBubble
                    message={message}
                    fresh={fresh}
                    onRetry={retryLast}
                    bubbleRef={message.id === lastMessageId && message.question !== null ? setLiveEl : undefined}
                    questionLive={message.id === lastMessageId}
                    busy={thread.thinking}
                    onPick={onPick}
                    onWriteInstead={onWriteInstead}
                  />
                  {/* La propuesta va DEBAJO del mensaje que la anuncia. `fresh`
                      solo en los mensajes de esta sesión (id local): al recargar
                      no debe volver a anunciarse. */}
                  {proposal !== undefined ? (
                    <ProposalCard
                      proposal={proposal}
                      fresh={fresh}
                      onAsk={blocked === null ? onAsk : undefined}
                      askDisabled={thread.thinking}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
          {/* Mientras Axel trabaja, sus PASOS van en la isla (tamaño M) y aquí,
              donde está la mirada, tres puntos. En cuanto empieza a escribir, el
              borrador los reemplaza: una burbuja aparte, sin id, hora ni traza. */}
          {thread.thinking && writing ? <LiveBubble /> : thread.thinking ? <AssistantThinking /> : null}
        </div>
      ) : null}
    </AssistantChatShell>
  );
}

/**
 * Los pasos del turno en la isla. Suscripción propia: los pasos cambian unas
 * pocas veces por turno y un fragmento de texto conserva su referencia.
 */
function AxelIslandSteps() {
  const steps = useCmoStore((state) => state.live?.steps);
  const chips = useMemo(() => stepChips(steps ?? []), [steps]);
  return <AssistantIslandActivity steps={steps ?? []} phrases={THINKING_PHASES} chips={chips} />;
}

/**
 * Lo que Axel va tocando, como chips (la segunda referencia del dueño): una
 * lectura en violeta, un cálculo en ámbar, una propuesta en azul, lo hecho en
 * verde. El tipo sale del nombre de la herramienta; el texto, de su etiqueta:
 * lo que mira, en tres palabras como mucho, para que quepan cuatro.
 */
export function stepChips(steps: readonly LiveStep[]): AssistantActivityChip[] {
  return steps.map((step, index) => {
    const tone = step.done ? "done" : chipTone(step.name);
    return {
      id: `${String(index)}-${step.name}`,
      label: shortLabel(step.label),
      icon: tone === "done" ? Check : tone === "calc" ? Calculator : tone === "send" ? Send : BookOpen,
      tone,
      current: !step.done && index === steps.length - 1,
    };
  });
}

function chipTone(name: string): AssistantActivityChip["tone"] {
  if (/propos|create|draft|send|campaign/i.test(name)) return "send";
  if (/calc|compute|forecast|estimate|score|pace/i.test(name)) return "calc";
  return "read";
}

/** Lo que mira, no lo que hace: «Leyendo tus ventas del mes» → «Ventas del mes». */
export function shortLabel(label: string): string {
  const words = label.replace(/…$/, "").trim().split(/\s+/).filter((word) => word !== "");
  if (words.length > 1 && /ndo$/i.test(words[0] ?? "")) words.shift();
  while (words.length > 1 && LEADING.has((words[0] ?? "").toLowerCase())) words.shift();
  const kept = words.slice(0, 3);
  while (kept.length > 1 && TRAILING.has((kept.at(-1) ?? "").toLowerCase())) kept.pop();
  const short = kept.join(" ");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

const LEADING = new Set(["el", "la", "los", "las", "un", "una", "tu", "tus", "su", "sus", "lo"]);
const TRAILING = new Set(["de", "del", "en", "con", "para", "por", "y", "a", "al", "la", "el", "los", "las"]);

/** El borrador que se escribe en vivo. Es lo ÚNICO que se repinta por fragmento. */
function LiveBubble() {
  const text = useCmoStore((state) => state.live?.text ?? "");
  return <AssistantBubble name="Axel" body={text} streaming />;
}

const MessageBubble = memo(function MessageBubble({
  message,
  fresh,
  onRetry,
  bubbleRef,
  questionLive,
  busy,
  onPick,
  onWriteInstead,
}: {
  message: UiMessage;
  fresh: boolean;
  onRetry: () => void;
  /** La burbuja de la pregunta viva: si no se ve, la isla la toma (D1). */
  bubbleRef?: Ref<HTMLDivElement>;
  /** true = es el último mensaje del hilo, así que su pregunta se puede tocar. */
  questionLive: boolean;
  busy: boolean;
  onPick: (label: string) => void;
  onWriteInstead: () => void;
}) {
  if (message.role === "owner") {
    return (
      <UserBubble
        body={message.body}
        pending={message.pending === true}
        failed={message.failed ?? null}
        onRetry={onRetry}
        fresh={fresh}
      />
    );
  }

  /* Los mensajes `system` son avisos del módulo, no diálogo: sin la identidad
     de Axel para que nadie atribuya al director algo que dijo el sistema. */
  if (message.role === "system") {
    return <SystemNote>{message.body}</SystemNote>;
  }

  return (
    <AssistantBubble
      ref={bubbleRef}
      name="Axel"
      body={message.body}
      sourcesCount={message.tool_calls?.length ?? 0}
      fresh={fresh}
    >
      {message.question === null ? null : (
        <AssistantQuestion
          question={message.question}
          live={questionLive}
          busy={busy}
          onPick={onPick}
          onWriteInstead={onWriteInstead}
        />
      )}
    </AssistantBubble>
  );
});
