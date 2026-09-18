"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Flame, Lock, Megaphone } from "lucide-react";

import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import {
  AssistantBubble,
  AssistantChatShell,
  AssistantComposer,
  AssistantDock,
  AssistantMark,
  AssistantQuestion,
  AssistantThinking,
  StarterPills,
  SystemNote,
  UserBubble,
  useTodayLabel,
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

/** Cuántas propuestas del informe entran al hilo. El resto vive en el rail. */
const PROPOSALS_IN_THREAD = 2;

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
 * El despacho de Axel, compuesto con el kit de asistente
 * (`shared/components/features/assistant`). Lo que queda aquí es lo que solo
 * el CMO sabe: el store, el informe, las propuestas ancladas al hilo, las
 * píldoras y el copy.
 *
 * Dos reglas que vienen de antes y siguen vivas: el mensaje propio se pinta
 * antes de la respuesta (el turno tarda decenas de segundos) y un turno que
 * falla no pierde el texto. Y una del rendimiento: este componente suscribe
 * `thread` y `live` enteros y se re-renderiza en cada delta; el avatar NO,
 * porque `AxelHeroAvatar` lleva su propia suscripción superficial.
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

  const inThread = proposals.filter((proposal) => !anchored.has(proposal.id)).slice(0, PROPOSALS_IN_THREAD);

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
      dock={
        blocked === null ? (
          <AssistantDock title="Axel" hero={<AxelHeroAvatar ownerTyping={ownerTyping} />} meta={today} />
        ) : undefined
      }
      actions={blocked === null ? <CmoActions /> : undefined}
      hero={
        blocked === null ? (
          <>
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
          </>
        ) : undefined
      }
      composer={composer}
      autoScrollDeps={[hasMessages, thread.messages.length, thread.thinking, proposals.length, live?.text.length]}
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
                    questionLive={message.id === lastMessageId}
                    busy={thread.thinking}
                    onPick={(label) => {
                      void answer(label);
                    }}
                    onWriteInstead={() => {
                      textareaRef.current?.focus();
                    }}
                  />
                  {/* La propuesta va DEBAJO del mensaje que la anuncia. `fresh`
                      solo en los mensajes de esta sesión (id local): al recargar
                      no debe volver a anunciarse. */}
                  {proposal !== undefined ? <ProposalCard proposal={proposal} fresh={fresh} /> : null}
                </Fragment>
              );
            })}
          </div>
          {/* Mientras Axel trabaja se ven sus PASOS; en cuanto empieza a
              escribir, el texto los reemplaza. El borrador es una burbuja
              aparte: no está guardado todavía y no tiene id, hora ni traza. */}
          {thread.thinking && live?.text ? (
            <AssistantBubble name="Axel" body={live.text} streaming />
          ) : thread.thinking ? (
            <AssistantThinking steps={live?.steps ?? []} phrases={THINKING_PHASES} />
          ) : null}
        </div>
      ) : null}
    </AssistantChatShell>
  );
}

function MessageBubble({
  message,
  fresh,
  onRetry,
  questionLive,
  busy,
  onPick,
  onWriteInstead,
}: {
  message: UiMessage;
  fresh: boolean;
  onRetry: () => void;
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
    <AssistantBubble name="Axel" body={message.body} sourcesCount={message.tool_calls?.length ?? 0} fresh={fresh}>
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
}
