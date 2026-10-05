"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { reviewQueue, type IntakeField, type IntakeSkipReason } from "@/modules/intake/domain/intake";
import { useAlbaIsland } from "@/modules/intake/infrastructure/hooks/use-alba-island";
import { intakeService } from "@/modules/intake/infrastructure/services/intake-service.adapter";
import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import {
  AssistantChatShell,
  AssistantComposer,
  AssistantDock,
  AssistantIslandActivity,
  AssistantMark,
  useInView,
  type AssistantComposerVoice,
  type AssistantIslandListeningState,
  type RecorderProblem,
} from "@/shared/components/features/assistant";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { AlbaHeroAvatar } from "./components/AlbaHeroAvatar";
import { AlbaIslandStatus } from "./components/AlbaIslandStatus";
import { SetupReview } from "./components/SetupReview";
import { originOf, reviewLine, SetupReviewCard, SetupReviewDone } from "./components/SetupReviewCard";
import { SetupBlocked, SetupDone, SetupSkeleton } from "./components/SetupStates";
import { SetupSummary } from "./components/SetupSummary";
import { SetupThread } from "./components/SetupThread";

/** Texto de reposo del compositor: constante, es la invariante del typewriter. */
const PLACEHOLDER = "Escribe o dicta…";

/** Lo que dice la isla mientras Alba piensa. Alba no informa pasos: son frases, y se detienen en la última. */
const THINKING_PHASES = ["Anotando lo que me contaste…", "Pensando la siguiente pregunta…"] as const;

/** Lo que tapa la isla arriba no cuenta como «a la vista». */
const ISLAND_MARGIN = "-72px 0px 0px 0px";

/** El copy de la tarjeta, el mismo en la isla. */
const REVIEW_COPY = {
  line: reviewLine,
  origin: (field: IntakeField) => originOf(field).text,
};

/**
 * La entrevista de puesta en marcha, tal como la ve el cliente.
 *
 * **La decisión de diseño que sostiene todo: chat Y ficha, no chat solo.** La
 * conversación es un método de entrada para un documento, no su sustituto: la
 * ficha está siempre a la vista en escritorio y a un toque en móvil, y todo en
 * ella se corrige sin consumir turno ni gastar IA.
 *
 * Desde island-live (informe de la entrevista de 2026-10-05), tres momentos:
 *
 * 1. **Revisar lo encontrado**: tarjetas en el hilo, tras el saludo, con «Así
 *    es / Corregir / Después» junto al dato. Sin turnos.
 * 2. **Completar lo que falta**: Alba pregunta solo lo abierto, una cosa a la
 *    vez, con opciones cerradas y el «por qué» plegado.
 * 3. **Revisar y enviar**: la revisión final, antes del cierre.
 *
 * La isla del kit acompaña: toma la pregunta viva cuando su burbuja no se ve y
 * avisa de lo que pasa (tema listo, lo esencial, el micrófono, el regreso).
 */
export function SetupView({ token }: { token: string }) {
  // Una suscripción superficial. Guardar un dato de la ficha cambia `session`
  // y repinta esta vista, pero NO el hilo: `SetupThread` es `memo`, recibe
  // `messages` (que no cambió), callbacks estables y un `review` memorizado.
  const {
    session,
    messages,
    loading,
    thinking,
    blocked,
    turnError,
    savingField,
    reviewTotal,
    reviewLater,
    reviewDeferred,
    reviewResolved,
    finalReviewOpen,
    finishing,
    finishError,
    load,
    send,
    retry,
    saveField,
    skipField,
    unskipField,
    deferTopic,
    resumeTopic,
    confirmField,
    correctField,
    laterField,
    deferReview,
    openFinalReview,
    closeFinalReview,
    finish,
    listened,
    reset,
  } = useIntakeStore(
    useShallow((state) => ({
      session: state.session,
      messages: state.messages,
      loading: state.loading,
      thinking: state.thinking,
      blocked: state.blocked,
      turnError: state.turnError,
      savingField: state.savingField,
      reviewTotal: state.reviewTotal,
      reviewLater: state.reviewLater,
      reviewDeferred: state.reviewDeferred,
      reviewResolved: state.reviewResolved,
      finalReviewOpen: state.finalReviewOpen,
      finishing: state.finishing,
      finishError: state.finishError,
      load: state.load,
      send: state.send,
      retry: state.retry,
      saveField: state.saveField,
      skipField: state.skipField,
      unskipField: state.unskipField,
      deferTopic: state.deferTopic,
      resumeTopic: state.resumeTopic,
      confirmField: state.confirmField,
      correctField: state.correctField,
      laterField: state.laterField,
      deferReview: state.deferReview,
      openFinalReview: state.openFinalReview,
      closeFinalReview: state.closeFinalReview,
      finish: state.finish,
      listened: state.listened,
      reset: state.reset,
    })),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  /* Una sola ficha montada: el lateral en escritorio o la hoja en móvil. */
  const mobile = useIsMobile();
  const [focusToken, setFocusToken] = useState(0);
  /* Alba «escucha» cuando la persona le está escribiendo: estado local de UI. */
  const [clientTyping, setClientTyping] = useState(false);
  /* El espejo del dictado y el motivo del micrófono, para la isla. */
  const [listening, setListening] = useState<AssistantIslandListeningState | null>(null);
  const [voiceProblem, setVoiceProblem] = useState<RecorderProblem | null>(null);
  /* La burbuja viva (tarjeta de revisión o pregunta): si no se ve, la isla la toma. */
  const [liveEl, setLiveEl] = useState<HTMLDivElement | null>(null);
  const liveInView = useInView(liveEl, { rootMargin: ISLAND_MARGIN, threshold: 0.3 });

  useEffect(() => {
    void load(token);
    return reset;
  }, [token, load, reset]);

  const focusComposer = useCallback(() => {
    setSheetOpen(false);
    setFocusToken((current) => current + 1);
  }, []);

  /* Dictado: el audio vuelve como texto al compositor y la persona lo revisa
     antes de enviar. El objeto es estable para que el compositor no re-arme
     la grabadora en cada render. */
  const voice = useMemo<AssistantComposerVoice>(
    () => ({
      transcribe: async (audio) => (await intakeService.transcribe(token, audio)).text,
    }),
    [token],
  );

  /** «Así es» desde la ficha o la tarjeta: confirmado tal cual, sin turno. */
  const confirm = useCallback(
    (field: IntakeField) => {
      void confirmField(field);
    },
    [confirmField],
  );

  /**
   * Un dato que la ficha no sabe editar en línea (un horario semanal, unas
   * preguntas frecuentes) se lleva al chat.
   */
  const askAbout = useCallback(
    (field: IntakeField) => {
      setSheetOpen(false);
      closeFinalReview();
      send(`Quiero corregir «${field.label}».`).catch(() => {
        // El store ya pinta el error del turno.
      });
    },
    [send, closeFinalReview],
  );

  const onSkip = useCallback(
    (field: IntakeField, reason: IntakeSkipReason) => {
      void skipField(field, reason);
    },
    [skipField],
  );
  const onUnskip = useCallback(
    (field: IntakeField) => {
      void unskipField(field);
    },
    [unskipField],
  );
  const onDefer = useCallback(
    (code: string) => {
      void deferTopic(code);
    },
    [deferTopic],
  );
  const onResume = useCallback(
    (code: string) => {
      void resumeTopic(code);
    },
    [resumeTopic],
  );
  const onPick = useCallback(
    (label: string) => {
      void send(label);
    },
    [send],
  );
  const onRetry = useCallback(() => {
    void retry();
  }, [retry]);
  const onOpenFinalReview = useCallback(() => {
    setSheetOpen(false);
    openFinalReview();
  }, [openFinalReview]);
  const showLive = useCallback(() => {
    setSheetOpen(false);
    liveEl?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [liveEl]);

  const finished = session !== null && session.status !== "in_progress";
  const topics = session?.topics;

  /* La cola de las tarjetas: lo encontrado sin confirmar, menos lo apartado. */
  const queue = useMemo(() => (topics === undefined ? [] : reviewQueue(topics)), [topics]);
  const remaining = useMemo(() => queue.filter((field) => !reviewLater.includes(field.code)), [queue, reviewLater]);
  const reviewField = finished || reviewDeferred ? null : (remaining[0] ?? null);
  const reviewedCount = Math.max(0, reviewTotal - remaining.length);
  const reviewTotalShown = Math.max(reviewTotal, reviewedCount + remaining.length);

  const onReviewPending = useCallback(() => {
    if (reviewField === null) onOpenFinalReview();
    else showLive();
  }, [reviewField, onOpenFinalReview, showLive]);

  /* Memorizado con primitivos y referencias estables: guardar un dato de la
     ficha NO puede repintar el hilo (`SetupThread` es `memo`). */
  const assistantName = session?.assistant_name ?? "";
  const reviewSaving = reviewField !== null && savingField === reviewField.code;
  const review = useMemo(() => {
    if (finished) return null;
    if (reviewResolved.length === 0 && reviewField === null) return null;
    return (
      <>
        {reviewResolved.map((entry) => (
          <SetupReviewDone key={entry.code} entry={entry} assistantName={assistantName} />
        ))}
        {reviewField === null ? null : (
          <SetupReviewCard
            key={reviewField.code}
            field={reviewField}
            assistantName={assistantName}
            saving={reviewSaving}
            reviewed={reviewedCount}
            total={reviewTotalShown}
            onConfirm={confirm}
            onCorrect={correctField}
            onAskAbout={askAbout}
            onLater={laterField}
            onDeferAll={deferReview}
            onListen={listened}
            cardRef={setLiveEl}
          />
        )}
      </>
    );
  }, [
    finished,
    assistantName,
    reviewResolved,
    reviewField,
    reviewSaving,
    reviewedCount,
    reviewTotalShown,
    confirm,
    correctField,
    askAbout,
    laterField,
    deferReview,
    listened,
  ]);

  const last = messages.at(-1);
  const liveQuestion =
    last !== undefined && last.role === "assistant" && last.question !== null
      ? { id: last.id, body: last.body, question: last.question }
      : null;

  const island = useAlbaIsland({
    active: session !== null && !finished && !loading,
    session: session ?? EMPTY_SESSION,
    liveQuestion: finished ? null : liveQuestion,
    reviewField,
    // Con la hoja de la ficha abierta en el móvil, la burbuja queda tapada.
    liveVisible: liveInView && !(mobile && sheetOpen),
    thinking,
    listening: listening !== null,
    voiceProblem,
    review: REVIEW_COPY,
    onPick,
    onWrite: focusComposer,
    onConfirm: confirm,
    onLater: laterField,
    onShowLive: showLive,
    onOpenFinalReview,
  });

  if (blocked !== null) return <SetupBlocked title={blocked.title} detail={blocked.detail} />;
  if (loading || session === null) return <SetupSkeleton />;

  const noTurns = session.turns_left <= 0;
  const essential = session.progress.essential;

  const summary = (className: string) => (
    <SetupSummary
      topics={session.topics}
      progress={session.progress}
      savingField={savingField}
      onSave={saveField}
      onConfirm={confirm}
      onAskAbout={askAbout}
      onSkip={onSkip}
      onUnskip={onUnskip}
      onDefer={onDefer}
      onResume={onResume}
      onReviewPending={onReviewPending}
      onOpenFinalReview={onOpenFinalReview}
      // Terminada, la ficha se relee: el servidor no acepta escribir en una
      // sesión cerrada y el cierre ya no promete corregir desde aquí.
      readOnly={finished}
      className={className}
    />
  );

  const reviewing = reviewField !== null;

  return (
    <main className="assistant-field flex h-[100dvh] flex-col overflow-hidden">
      <div className="relative z-10 flex min-h-0 flex-1">
        <section className="relative flex min-h-0 flex-1 flex-col">
          {finished ? (
            <SetupDone
              closing={session.closing}
              summary={session.summary}
              companyName={session.company_name}
              assistantName={session.assistant_name}
              onReview={() => {
                setSheetOpen(true);
              }}
            />
          ) : finalReviewOpen ? (
            <SetupReview
              topics={session.topics}
              progress={session.progress}
              savingField={savingField}
              finishing={finishing}
              finishError={finishError}
              onSave={saveField}
              onConfirm={confirm}
              onAskAbout={askAbout}
              onSkip={onSkip}
              onUnskip={onUnskip}
              onBack={closeFinalReview}
              onFinish={() => {
                void finish();
              }}
            />
          ) : (
            <AssistantChatShell
              // El saludo es guionizado: la conversación nunca está vacía.
              empty={false}
              dock={
                <AssistantDock
                  title={session.assistant_name}
                  hero={<AlbaHeroAvatar name={session.assistant_name} clientTyping={clientTyping} />}
                  meta={reviewing ? "Revisando lo que encontré" : `Poniendo a punto ${session.company_name}`}
                  status={
                    reviewing ? (
                      <span className="text-[12px] tabular-nums">
                        <b className="font-semibold">
                          {reviewedCount} de {reviewTotalShown}
                        </b>
                        <span className="assistant-island__muted"> revisados</span>
                      </span>
                    ) : (
                      <AlbaIslandStatus progress={session.progress} />
                    )
                  }
                  working={thinking}
                  activity={<AssistantIslandActivity phrases={THINKING_PHASES} />}
                  item={island.current}
                  pending={island.pending}
                  onFold={island.fold}
                  onExpand={island.expand}
                  onDismiss={island.dismiss}
                  listening={listening}
                  onListen={listened}
                />
              }
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                  className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-foreground/[0.06] px-3 text-[12.5px] font-semibold text-foreground tabular-nums transition-transform active:scale-[.96] lg:hidden"
                  aria-label={`Abrir la ficha: ${String(essential.confirmed)} de ${String(essential.total)} datos esenciales confirmados`}
                >
                  <ClipboardList className="size-[15px] text-accent-violet" aria-hidden="true" />
                  {essential.confirmed}/{essential.total}
                </button>
              }
              composer={
                <AssistantComposer
                  onSend={(body, meta) => {
                    void send(body, meta.voice);
                  }}
                  disabled={noTurns}
                  busy={thinking}
                  placeholder={PLACEHOLDER}
                  ariaLabel="Tu respuesta"
                  voice={session.voice_enabled ? voice : undefined}
                  focusToken={focusToken}
                  onTypingChange={setClientTyping}
                  onListeningChange={setListening}
                  onVoiceProblem={setVoiceProblem}
                  footer={
                    <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/80">
                      <AssistantMark size="sm" />
                      {noTurns
                        ? "Se acabaron los turnos de esta conversación. Puedes corregir desde la ficha."
                        : "Nada se aplica sin que alguien de tu equipo lo revise · se guarda solo"}
                    </p>
                  }
                />
              }
              autoScrollDeps={[messages.length, thinking, reviewResolved.length]}
            >
              <SetupThread
                messages={messages}
                assistantName={session.assistant_name}
                thinking={thinking}
                turnError={turnError}
                onPick={onPick}
                onWriteInstead={focusComposer}
                onRetry={onRetry}
                review={review}
                liveQuestionRef={reviewing ? undefined : setLiveEl}
                onListen={listened}
              />
            </AssistantChatShell>
          )}
        </section>

        {/* Escritorio: la ficha SIEMPRE a la vista (salvo en la revisión final, que es la ficha entera). */}
        {mobile || finalReviewOpen
          ? null
          : summary("hidden w-[380px] flex-none border-l border-foreground/[0.09] bg-secondary/40 lg:flex")}
      </div>

      {/* Móvil: la misma ficha, en una hoja de Radix: el foco entra en ella y
          vuelve al botón que la abrió al cerrarla (H7). */}
      {mobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
            className="flex max-h-[90dvh] flex-col gap-0 rounded-t-[28px] border-0 bg-background p-0 pt-2.5"
          >
            <SheetTitle className="sr-only">Ficha de {session.company_name}</SheetTitle>
            <span className="mx-auto h-[5px] w-9 flex-none rounded-full bg-foreground/[0.18]" aria-hidden="true" />
            {summary("min-h-0 flex-1")}
          </SheetContent>
        </Sheet>
      ) : null}
    </main>
  );
}

/**
 * La sesión mientras carga: la isla se calcula antes del primer `return` (los
 * hooks no pueden ir detrás de una salida temprana) y necesita una forma.
 */
const EMPTY_SESSION = {
  status: "in_progress",
  assistant_name: "",
  company_name: "",
  invite_name: null,
  estimated_minutes: 0,
  turns_left: 0,
  voice_enabled: false,
  messages: [],
  topics: [],
  progress: {
    topics: [],
    percent: 0,
    next_topic: null,
    next_field: null,
    has_pending_required: false,
    has_pending_confirmation: false,
    essential: { confirmed: 0, total: 0, complete: false },
    pending_review: 0,
    next_ask: null,
  },
  closing: null,
  summary: null,
  resume: null,
} satisfies Parameters<typeof useAlbaIsland>[0]["session"];
