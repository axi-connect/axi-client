"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Square } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { useVoiceRecorder } from "@/modules/intake/infrastructure/hooks/use-voice-recorder";

/** Alto máximo del compositor antes de hacer scroll interno. */
const MAX_PX = 140;

/**
 * El compositor: escribir o dictar.
 *
 * **El botón de dictar es probablemente la decisión de producto más importante
 * de toda la pantalla.** WhatsApp mueve miles de millones de notas de voz al
 * día, dictar es unas tres veces más rápido que teclear en un móvil, y en
 * Latinoamérica la preferencia por la voz es estructural. Quien va a contestar
 * esto es un dueño de PyME colombiano que vive en WhatsApp: pedirle que teclee
 * la descripción de su negocio es pedirle justo lo que menos hace. Y de un
 * audio de veinte segundos el asistente saca cuatro datos de golpe.
 *
 * La transcripción **no se envía sola**: se pinta en el compositor para que su
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
  /** true cuando lo que hay en el compositor viene de un dictado. */
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
  const canRecord =
    voiceEnabled && !disabled && !busy && (recorder.state === "idle" || recording);

  return (
    <div className="flex-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "rounded-xl border bg-background shadow-float transition-colors",
          recording ? "border-destructive/50" : "border-border focus-within:border-primary/40",
        )}
      >
        {recording ? (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-2.5 flex-none animate-pulse rounded-full bg-destructive" />
            <p className="flex-1 text-[13px] text-foreground">
              Te escucho… <span className="tabular-nums text-muted-foreground">{fmt(recorder.seconds)}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-[12px] text-muted-foreground"
              onClick={recorder.cancel}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="icon"
              className="size-9 flex-none rounded-full"
              onClick={() => void finishRecording()}
              aria-label="Terminar de dictar"
            >
              <Square className="size-3.5 fill-current" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="px-4 py-3"
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
                // trae su propio salto de línea y el botón está a la vista.
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
              className="w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[10.5px] text-muted-foreground/60">
                {fromVoice ? "Lo dicté yo · revísalo antes de enviar" : ""}
              </p>

              <div className="flex items-center gap-1.5">
                {canRecord ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={recorder.start}
                    disabled={transcribing}
                    aria-label="Dictar en vez de escribir"
                  >
                    {transcribing ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mic className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  size="icon"
                  disabled={draft.trim() === "" || disabled || busy}
                  className="bg-brand-gradient size-9 rounded-full text-primary-foreground"
                  aria-label="Enviar"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {voiceError === null ? null : (
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">{voiceError}</p>
      )}
      {recorder.state === "denied" ? (
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          No pudimos usar el micrófono. Escríbelo y seguimos igual.
        </p>
      ) : null}
    </div>
  );
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m)}:${s.toString().padStart(2, "0")}`;
}
