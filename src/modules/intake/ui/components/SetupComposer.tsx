"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Square } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useVoiceRecorder } from "@/modules/intake/infrastructure/hooks/use-voice-recorder";

/** Alto máximo del compositor antes de hacer scroll interno. */
const MAX_PX = 120;

/**
 * El compositor: una cápsula flotante, como la de Messages.
 *
 * Flota sobre el hilo con material translúcido en vez de ocupar una franja
 * fija: el hilo se lee por debajo y la pantalla del móvil no pierde altura.
 * El micrófono va DENTRO de la cápsula y el envío es el círculo coral —el
 * color de acción— con la flecha hacia arriba.
 *
 * **El botón de dictar es probablemente la decisión de producto más importante
 * de toda la pantalla.** WhatsApp mueve miles de millones de notas de voz al
 * día, dictar es unas tres veces más rápido que teclear en un móvil, y en
 * Latinoamérica la preferencia por la voz es estructural. Quien va a contestar
 * esto es un dueño de PyME colombiano que vive en WhatsApp.
 *
 * La transcripción **no se envía sola**: se pinta en la cápsula para que su
 * autor la lea. Whisper se equivoca, y mandar sin revisar convierte un error de
 * transcripción en un dato mal guardado del que nadie sabe el origen.
 */
export function SetupComposer({
  disabled,
  busy,
  voiceEnabled,
  placeholder,
  onSend,
  onTranscribe,
  focusToken,
}: {
  disabled: boolean;
  busy: boolean;
  voiceEnabled: boolean;
  placeholder: string;
  onSend: (text: string, voice: boolean) => void;
  onTranscribe: (audio: Blob) => Promise<string | null>;
  /** Cambia cuando algo externo pide el foco (p. ej. «prefiero contarlo yo»). */
  focusToken: number;
}) {
  const [draft, setDraft] = useState("");
  const [fromVoice, setFromVoice] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const recorder = useVoiceRecorder(voiceEnabled);

  useEffect(() => {
    if (focusToken > 0) areaRef.current?.focus();
  }, [focusToken]);

  const autosize = useCallback(() => {
    const el = areaRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${String(Math.min(el.scrollHeight, MAX_PX))}px`;
  }, []);

  useEffect(autosize, [draft, autosize]);

  function submit(): void {
    const body = draft.trim();
    if (body === "" || disabled || busy) return;
    onSend(body, fromVoice);
    setDraft("");
    setFromVoice(false);
  }

  async function finishRecording(): Promise<void> {
    const audio = await recorder.stop();
    if (audio === null) return;

    setTranscribing(true);
    setVoiceError(null);
    const text = await onTranscribe(audio);
    setTranscribing(false);

    if (text === null) {
      setVoiceError("No pude entender el audio. Puedes escribirlo y seguimos igual.");
      return;
    }
    // Se acumula en vez de reemplazar: alguien puede dictar, corregir a mano y
    // volver a dictar sin perder lo anterior.
    setDraft((current) => (current === "" ? text : `${current} ${text}`));
    setFromVoice(true);
    window.setTimeout(() => areaRef.current?.focus(), 0);
  }

  const recording = recorder.state === "recording";
  const canRecord = voiceEnabled && !disabled && !busy && (recorder.state === "idle" || recording);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[var(--intake-ground)] from-55% to-transparent px-4 pt-3 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto max-w-[640px]">
        <div
          className={cn(
            "intake-glass intake-glass--strong flex items-end gap-1.5 rounded-[26px] border py-1.5 pr-1.5 pl-[18px] shadow-float",
            "transition-[border-color] duration-200",
            recording
              ? "border-brand/50"
              : "border-[var(--intake-hair-strong)] focus-within:border-brand/50",
          )}
        >
          {recording ? (
            <div className="flex w-full items-center gap-3 py-1 pl-0.5">
              <span className="size-2.5 flex-none animate-pulse rounded-full bg-brand" />
              <p className="flex-1 text-[15px] text-foreground">
                Te escucho…{" "}
                <span className="text-muted-foreground tabular-nums">{fmt(recorder.seconds)}</span>
              </p>
              <span className="intake-wave" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <button
                type="button"
                onClick={recorder.cancel}
                className="px-2 text-[13px] font-medium text-muted-foreground transition-opacity active:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void finishRecording()}
                className="intake-send flex size-[38px] flex-none items-center justify-center rounded-full transition-transform active:scale-[.92]"
                aria-label="Terminar de dictar"
              >
                <Square className="size-3.5 fill-current" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="flex w-full items-end gap-1.5"
            >
              <textarea
                ref={areaRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (event.target.value === "") setFromVoice(false);
                }}
                onKeyDown={(event) => {
                  // Enter envía, Shift+Enter salta de línea. En móvil el teclado
                  // trae su propio salto y el botón está a la vista.
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                disabled={disabled}
                placeholder={transcribing ? "Pasando tu audio a texto…" : placeholder}
                aria-label="Tu respuesta"
                style={{ maxHeight: MAX_PX }}
                className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] leading-[1.45] outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
              />

              {canRecord ? (
                <button
                  type="button"
                  onClick={recorder.start}
                  disabled={transcribing}
                  className="flex size-[38px] flex-none items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-[var(--intake-fill)] hover:text-foreground active:scale-[.92]"
                  aria-label="Dictar en vez de escribir"
                >
                  {transcribing ? (
                    <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic className="size-[18px]" aria-hidden="true" />
                  )}
                </button>
              ) : null}

              <button
                type="submit"
                disabled={draft.trim() === "" || disabled || busy}
                className="intake-send flex size-[38px] flex-none items-center justify-center rounded-full transition-[transform,opacity] active:scale-[.92] disabled:opacity-40 disabled:shadow-none"
                aria-label="Enviar"
              >
                <ArrowUp className="size-[17px] [stroke-width:2.6]" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>

        {fromVoice && !recording ? (
          <p className="mt-1.5 px-6 text-[11.5px] text-muted-foreground/70">
            Lo dicté yo · revísalo antes de enviar
          </p>
        ) : null}
        {voiceError === null ? null : (
          <p className="mt-1.5 px-6 text-[11.5px] text-muted-foreground">{voiceError}</p>
        )}
        {recorder.state === "denied" ? (
          <p className="mt-1.5 px-6 text-[11.5px] text-muted-foreground">
            No pudimos usar el micrófono. Escríbelo y seguimos igual.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m)}:${s.toString().padStart(2, "0")}`;
}
