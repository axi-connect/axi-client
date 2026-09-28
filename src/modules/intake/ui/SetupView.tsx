"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { countCaptured, type IntakeField } from "@/modules/intake/domain/intake";
import { intakeService } from "@/modules/intake/infrastructure/services/intake-service.adapter";
import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import {
  AssistantChatShell,
  AssistantComposer,
  AssistantDock,
  AssistantIslandActivity,
  AssistantMark,
  type AssistantComposerVoice,
} from "@/shared/components/features/assistant";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { AlbaHeroAvatar } from "./components/AlbaHeroAvatar";
import { AlbaIslandStatus } from "./components/AlbaIslandStatus";
import { SetupBlocked, SetupDone, SetupSkeleton } from "./components/SetupStates";
import { SetupSummary } from "./components/SetupSummary";
import { SetupThread } from "./components/SetupThread";

/** Texto de reposo del compositor: constante, es la invariante del typewriter. */
const PLACEHOLDER = "Escribe o dicta…";

/** Lo que dice la isla mientras Alba piensa. Alba no informa pasos: son frases, y se detienen en la última. */
const THINKING_PHASES = ["Anotando lo que me contaste…", "Pensando la siguiente pregunta…"] as const;

/**
 * La entrevista de puesta en marcha, tal como la ve el cliente.
 *
 * **La decisión de diseño que sostiene todo: chat Y ficha, no chat solo.**
 *
 * La evidencia sobre formatos conversacionales es tajante en las dos
 * direcciones. A favor: una pregunta a la vez dobla la finalización frente a un
 * formulario de página única. En contra: por encima de unas catorce preguntas
 * el mismo formato se siente MÁS largo, pierde el panorama, no deja editar lo
 * anterior ni saltar, y hay gente que rebota ante cualquier chat. Configurar un
 * tenant son treinta o cuarenta datos: justo el rango donde el chat solo
 * empeora la experiencia.
 *
 * La salida no es preguntar mejor: es que **la conversación sea un método de
 * entrada para un documento**, no un sustituto del documento. La ficha está
 * siempre a la vista en escritorio y a un toque en móvil, y todo en ella se
 * puede corregir sin hablar con nadie —sin consumir turno ni gastar IA.
 *
 * El chat es el mismo kit que el despacho de Axel (`shared/components/features/
 * assistant`): el aura, la barra con Alba, las burbujas, la pregunta agrupada
 * y la cápsula del compositor. Lo que aquí se decide es solo lo del intake: el
 * store, la ficha, la voz y el copy.
 */
export function SetupView({ token }: { token: string }) {
  // Una suscripción superficial. Guardar un dato de la ficha cambia `session`
  // y repinta esta vista, pero NO el hilo: `SetupThread` es `memo`, recibe
  // `messages` (que no cambió) y callbacks estables.
  const {
    session,
    messages,
    loading,
    thinking,
    blocked,
    turnError,
    savingField,
    load,
    send,
    retry,
    saveField,
    skipField,
    unskipField,
    deferTopic,
    resumeTopic,
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
      load: state.load,
      send: state.send,
      retry: state.retry,
      saveField: state.saveField,
      skipField: state.skipField,
      unskipField: state.unskipField,
      deferTopic: state.deferTopic,
      resumeTopic: state.resumeTopic,
      reset: state.reset,
    })),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  /* Una sola ficha montada: el lateral en escritorio o la hoja en móvil. Antes
     había dos a la vez y cada dato guardado pintaba las dos. */
  const mobile = useIsMobile();
  const [focusToken, setFocusToken] = useState(0);
  /* Alba «escucha» cuando la persona le está escribiendo: foco en el
     compositor o borrador sin enviar. Estado local de UI, no del store. */
  const [clientTyping, setClientTyping] = useState(false);

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

  /**
   * Confirmar una deducción desde la ficha: se guarda su propio valor. Hace lo
   * mismo que decir «sí, así es» en el chat, pero sin gastar un turno.
   */
  const confirm = useCallback(
    (field: IntakeField) => {
      void saveField(field, field.value);
    },
    [saveField],
  );

  /**
   * Un dato que la ficha no sabe editar en línea (un horario semanal, unas
   * preguntas frecuentes) se lleva al chat. Inventar aquí un editor de horarios
   * sería reconstruir el panel dentro de la pantalla que vino a sustituirlo.
   */
  const askAbout = useCallback(
    (field: IntakeField) => {
      setSheetOpen(false);
      send(`Quiero corregir «${field.label}».`).catch(() => {
        // El store ya pinta el error del turno.
      });
    },
    [send],
  );

  const onSkip = useCallback(
    (field: IntakeField) => {
      void skipField(field, "no_aplica");
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

  if (blocked !== null) return <SetupBlocked title={blocked.title} detail={blocked.detail} />;
  if (loading || session === null) return <SetupSkeleton />;

  const finished = session.status !== "in_progress";
  const noTurns = session.turns_left <= 0;
  const { filled, total } = countCaptured(session.topics);

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
      // Terminada, la ficha se relee: el servidor no acepta escribir en una
      // sesión cerrada y el cierre ya no promete corregir desde aquí.
      readOnly={finished}
      className={className}
    />
  );

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
          ) : (
            <AssistantChatShell
              // El saludo es guionizado: la conversación nunca está vacía.
              empty={false}
              dock={
                <AssistantDock
                  title={session.assistant_name}
                  hero={<AlbaHeroAvatar name={session.assistant_name} clientTyping={clientTyping} />}
                  meta={`Poniendo a punto ${session.company_name}`}
                  status={<AlbaIslandStatus progress={session.progress} />}
                  working={thinking}
                  activity={<AssistantIslandActivity phrases={THINKING_PHASES} />}
                />
              }
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                  className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-foreground/[0.06] px-3 text-[12.5px] font-semibold text-foreground tabular-nums transition-transform active:scale-[.96] lg:hidden"
                  aria-label={`Abrir la ficha: ${String(filled)} de ${String(total)} datos`}
                >
                  <ClipboardList className="size-[15px] text-accent-violet" aria-hidden="true" />
                  {filled}/{total}
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
                  footer={
                    <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/80">
                      <AssistantMark size="sm" />
                      {noTurns
                        ? "Se acabaron los turnos de esta conversación. Puedes corregir desde la ficha."
                        : "Nada se aplica sin que alguien de tu equipo lo revise."}
                    </p>
                  }
                />
              }
              autoScrollDeps={[messages.length, thinking]}
            >
              <SetupThread
                messages={messages}
                assistantName={session.assistant_name}
                thinking={thinking}
                turnError={turnError}
                onPick={onPick}
                onWriteInstead={focusComposer}
                onRetry={onRetry}
              />
            </AssistantChatShell>
          )}
        </section>

        {/* Escritorio: la ficha SIEMPRE a la vista. Es la mitad del diseño. */}
        {mobile ? null : summary("hidden w-[380px] flex-none border-l border-foreground/[0.09] bg-secondary/40 lg:flex")}
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
