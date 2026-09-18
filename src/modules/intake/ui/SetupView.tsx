"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { countCaptured, type IntakeField } from "@/modules/intake/domain/intake";
import { intakeService } from "@/modules/intake/infrastructure/services/intake-service.adapter";
import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import {
  AssistantChatShell,
  AssistantComposer,
  AssistantDock,
  AssistantMark,
  type AssistantComposerVoice,
} from "@/shared/components/features/assistant";
import { AlbaHeroAvatar } from "./components/AlbaHeroAvatar";
import { SetupBlocked, SetupDone, SetupSkeleton } from "./components/SetupStates";
import { SetupSummary } from "./components/SetupSummary";
import { SetupThread } from "./components/SetupThread";

/** Texto de reposo del compositor: constante, es la invariante del typewriter. */
const PLACEHOLDER = "Escribe o dicta…";

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
  // Selectores individuales: la ficha guarda un dato y no debe repintar el hilo entero.
  const session = useIntakeStore((state) => state.session);
  const messages = useIntakeStore((state) => state.messages);
  const loading = useIntakeStore((state) => state.loading);
  const thinking = useIntakeStore((state) => state.thinking);
  const blocked = useIntakeStore((state) => state.blocked);
  const turnError = useIntakeStore((state) => state.turnError);
  const savingField = useIntakeStore((state) => state.savingField);
  const load = useIntakeStore((state) => state.load);
  const send = useIntakeStore((state) => state.send);
  const retry = useIntakeStore((state) => state.retry);
  const saveField = useIntakeStore((state) => state.saveField);
  const deferTopic = useIntakeStore((state) => state.deferTopic);
  const resumeTopic = useIntakeStore((state) => state.resumeTopic);
  const reset = useIntakeStore((state) => state.reset);

  const [sheetOpen, setSheetOpen] = useState(false);
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
      onDefer={(code) => {
        void deferTopic(code);
      }}
      onResume={(code) => {
        void resumeTopic(code);
      }}
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
                onPick={(label) => {
                  void send(label);
                }}
                onWriteInstead={focusComposer}
                onRetry={() => {
                  void retry();
                }}
              />
            </AssistantChatShell>
          )}
        </section>

        {/* Escritorio: la ficha SIEMPRE a la vista. Es la mitad del diseño. */}
        {summary("hidden w-[380px] flex-none border-l border-foreground/[0.09] bg-secondary/40 lg:flex")}
      </div>

      {/* Móvil: la misma ficha, en una hoja con su asa. */}
      <div
        className={cn("fixed inset-0 z-50 lg:hidden", sheetOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!sheetOpen}
      >
        <button
          type="button"
          tabIndex={sheetOpen ? 0 : -1}
          onClick={() => {
            setSheetOpen(false);
          }}
          className={cn(
            "absolute inset-0 bg-black/28 transition-opacity duration-300",
            sheetOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Cerrar"
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[28px] bg-background shadow-overlay",
            "transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            sheetOpen ? "translate-y-0" : "translate-y-[102%]",
          )}
        >
          <div className="relative flex flex-none justify-center pt-2.5">
            <span className="h-[5px] w-9 rounded-full bg-foreground/[0.18]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setSheetOpen(false);
              }}
              className="absolute top-2 right-4 flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
              aria-label="Cerrar"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {summary("min-h-0 flex-1")}
        </div>
      </div>
    </main>
  );
}
