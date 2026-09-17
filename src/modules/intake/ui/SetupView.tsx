"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { countCaptured, type IntakeField } from "@/modules/intake/domain/intake";
import { intakeService } from "@/modules/intake/infrastructure/services/intake-service.adapter";
import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import { AlbaMark } from "./components/AlbaMark";
import { SetupChat } from "./components/SetupChat";
import { SetupComposer } from "./components/SetupComposer";
import { SetupProgress } from "./components/SetupProgress";
import { SetupBlocked, SetupDone, SetupSkeleton } from "./components/SetupStates";
import { SetupSummary } from "./components/SetupSummary";

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
 * El lenguaje es el de iOS con la marca de axi: suelo agrupado con tarjetas
 * encima, barra y compositor translúcidos, el coral como color de acción y el
 * violeta como acento de IA. En móvil la ficha vive en una hoja que sube — en
 * una pantalla de teléfono dos columnas son cero columnas.
 */
export function SetupView({ token }: { token: string }) {
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
    deferTopic,
    resumeTopic,
    reset,
  } = useIntakeStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    void load(token);
    return reset;
  }, [token, load, reset]);

  const focusComposer = useCallback(() => {
    setSheetOpen(false);
    setFocusToken((current) => current + 1);
  }, []);

  const transcribe = useCallback(
    async (audio: Blob): Promise<string | null> => {
      try {
        const { text } = await intakeService.transcribe(token, audio);
        return text;
      } catch {
        return null;
      }
    },
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
    <main className="intake-shell flex h-[100dvh] flex-col overflow-hidden">
      {/* Barra translúcida: quién habla y cuánto falta. */}
      <header className="intake-glass relative z-10 flex-none border-b border-[var(--intake-hair)]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-[18px] pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5">
          <AlbaMark size={34} busy={thinking} className="flex-none" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-tight font-semibold tracking-[-0.012em] text-foreground">
              {session.assistant_name}
              <span className="ml-1.5 font-normal text-muted-foreground">· axi</span>
            </p>
            <p className="mt-px truncate text-[12.5px] text-muted-foreground">
              Poniendo a punto {session.company_name}
            </p>
          </div>

          <SetupProgress progress={session.progress} className="hidden w-[280px] flex-none md:flex" />

          <button
            type="button"
            onClick={() => {
              setSheetOpen(true);
            }}
            className="flex flex-none items-center gap-1.5 rounded-full bg-[var(--intake-fill)] px-3 py-[7px] text-[13px] font-medium text-foreground tabular-nums transition-transform active:scale-[.96] lg:hidden"
          >
            <ClipboardList className="size-3.5" aria-hidden="true" />
            {filled}/{total}
          </button>
        </div>

        <div className="px-[18px] pb-[13px] md:hidden">
          <SetupProgress progress={session.progress} />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        <section className="relative flex min-h-0 flex-1 flex-col">
          {finished ? (
            <SetupDone
              closing={session.closing}
              companyName={session.company_name}
              onReview={() => {
                setSheetOpen(true);
              }}
            />
          ) : (
            <>
              <SetupChat
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

              <SetupComposer
                disabled={session.turns_left <= 0}
                busy={thinking}
                voiceEnabled={session.voice_enabled}
                placeholder="Escribe o toca el micrófono…"
                onSend={(text, voice) => {
                  void send(text, voice);
                }}
                onTranscribe={transcribe}
                focusToken={focusToken}
              />
            </>
          )}
        </section>

        {/* Escritorio: la ficha SIEMPRE a la vista. Es la mitad del diseño. */}
        {summary("hidden w-[380px] flex-none border-l border-[var(--intake-hair)] lg:flex")}
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
            "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[24px] bg-[var(--intake-ground)] shadow-overlay",
            "transition-transform duration-[420ms] [transition-timing-function:var(--intake-ease)]",
            sheetOpen ? "translate-y-0" : "translate-y-[102%]",
          )}
        >
          <div className="relative flex flex-none justify-center pt-2.5">
            <span className="h-[5px] w-9 rounded-full bg-[var(--intake-hair-strong)]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setSheetOpen(false);
              }}
              className="absolute top-2 right-4 flex size-8 items-center justify-center rounded-full bg-[var(--intake-fill)] text-muted-foreground"
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
