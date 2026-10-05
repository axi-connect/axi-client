"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowUp, Loader2, Mic, MicOff, Square } from "lucide-react";

import { useTypewriterPlaceholder } from "@/core/hooks/use-typewriter-placeholder";
import { recorderProblem, useVoiceRecorder, type RecorderProblem } from "@/core/hooks/use-voice-recorder";
import { cn } from "@/core/lib/utils";
import type { AssistantIslandListeningState } from "../types";

/** Altura máxima del campo, en px: una sola fuente para el estilo y el JS. */
export const COMPOSER_MAX_PX = 120;

/** Sin frases, el placeholder se queda quieto. Constante de módulo: es la invariante del typewriter. */
const NO_PHRASES: readonly string[] = [];

export interface AssistantComposerVoice {
  /** Convierte el audio en texto; el kit lo añade al borrador para que se revise antes de enviar. */
  transcribe: (audio: Blob) => Promise<string>;
}

/**
 * Qué decirle a la persona cuando el micrófono no está: el motivo y la salida
 * (informe de la entrevista, rec. 16). El título cabe en un aviso (≤ 34).
 */
export const VOICE_PROBLEM_COPY: Record<RecorderProblem, { title: string; body: string }> = {
  denied: { title: "El micrófono está bloqueado", body: "Actívalo en el candado del navegador, o escribe tu respuesta." },
  no_device: { title: "No encontré un micrófono", body: "Conecta uno, o escribe tu respuesta." },
  unsupported: { title: "Este navegador no puede dictar", body: "Escribe tu respuesta; todo lo demás funciona igual." },
  failed: { title: "No pude abrir el micrófono", body: "Puede que otra aplicación lo esté usando. Inténtalo de nuevo o escribe." },
};

interface AssistantComposerProps {
  onSend: (body: string, meta: { voice: boolean }) => void;
  /** El asistente no está disponible: el campo se apaga. */
  disabled?: boolean;
  /** Hay un turno en curso: no se envía otro. */
  busy?: boolean;
  /**
   * Texto de reposo. CONSTANTE por contrato: es lo que se ve en SSR y a lo que
   * vuelve el efecto en cada pausa; una prop dinámica pisaría la frase tecleada.
   */
  placeholder: string;
  /** Lo que el campo teclea solo. Constante de módulo en el llamador. */
  placeholderPhrases?: readonly string[];
  ariaLabel: string;
  /** Con esto el compositor dicta: micrófono, onda y transcripción. */
  voice?: AssistantComposerVoice;
  /** Cambiar este número enfoca el campo (tras «prefiero escribir»). */
  focusToken?: number;
  /** Para que el llamador pueda enfocar el campo (la salida de la pregunta). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Foco en el campo o borrador sin enviar: el personaje «escucha». */
  onTypingChange?: (typing: boolean) => void;
  /** Debajo de la cápsula, antes del pie: las píldoras de arranque. */
  after?: ReactNode;
  /** El pie: la promesa de confianza. */
  footer?: ReactNode;
  /** Atenúa la cápsula (asistente bloqueado). */
  dimmed?: boolean;
  /**
   * Mientras graba, el estado del dictado para que la isla lo refleje (forma E).
   * Detener y Cancelar son los del compositor: la isla no tiene otro grabador.
   * Se lee por ref: un callback en línea no provoca un vaivén por render.
   */
  onListeningChange?: (listening: AssistantIslandListeningState | null) => void;
  /**
   * Quién cuenta por qué el micrófono no está. Sin esto, el compositor lo dice
   * debajo de la cápsula; con esto, lo cuenta el llamador (la isla de Alba) y
   * aquí no se repite: una sola copia visible. Solo se avisa DESPUÉS de pulsar
   * el micrófono: nadie quiere un reproche al abrir la pantalla.
   */
  onVoiceProblem?: (problem: RecorderProblem | null) => void;
  className?: string;
}

/**
 * El compositor del asistente: una cápsula de cristal con el campo, el botón de
 * enviar y, si el asistente escucha, el micrófono.
 *
 * Es cristal (`.glass`) porque FLOTA sobre el hilo (DESIGN-SYSTEM §5.2), y el
 * núcleo del aura cae justo detrás: por eso se lee como la fuente de luz de la
 * pantalla y no como una caja pegada abajo.
 *
 * Comportamiento común a Axel y Alba, antes duplicado línea por línea:
 * autosize hasta `COMPOSER_MAX_PX`, Enter envía y Shift+Enter salta de línea, el
 * vacío no envía, el placeholder se teclea solo mientras no hay texto ni turno.
 *
 * La voz es opcional y es de quien la pide: el permiso del micrófono se solicita
 * al pulsar, la transcripción se AÑADE al borrador (no se envía sola) y la
 * persona la revisa; `voice: true` viaja con el mensaje para que el hilo lo
 * marque como dictado.
 */
export function AssistantComposer({
  onSend,
  disabled = false,
  busy = false,
  placeholder,
  placeholderPhrases,
  ariaLabel,
  voice,
  focusToken,
  textareaRef,
  onTypingChange,
  after,
  footer,
  dimmed = false,
  onListeningChange,
  onVoiceProblem,
  className,
}: AssistantComposerProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = textareaRef ?? innerRef;
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [fromVoice, setFromVoice] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorder = useVoiceRecorder(voice !== undefined);
  const recording = recorder.state === "recording" || recorder.state === "requesting";
  const locked = disabled || busy;
  const [micTried, setMicTried] = useState(false);
  const problem = voice !== undefined && micTried ? recorderProblem(recorder.state) : null;

  useTypewriterPlaceholder(ref, {
    phrases: placeholderPhrases ?? NO_PHRASES,
    fallback: placeholder,
    enabled: draft === "" && !locked && !recording,
  });

  useEffect(() => {
    if (focusToken === undefined || focusToken === 0) return;
    ref.current?.focus();
  }, [focusToken, ref]);

  const typing = focused || draft.trim() !== "";
  useEffect(() => {
    onTypingChange?.(typing);
  }, [typing, onTypingChange]);

  useEffect(() => {
    onVoiceProblem?.(problem);
  }, [problem, onVoiceProblem]);

  /* El espejo de la isla. `finishRecording` y `cancel` se leen por ref: la isla
     recibe un objeto nuevo por segundo (el reloj), no por cada render. */
  const finishRef = useRef<() => void>(() => undefined);
  const cancelRef = useRef(recorder.cancel);
  const listeningRef = useRef(onListeningChange);
  useEffect(() => {
    listeningRef.current = onListeningChange;
  });
  const listeningSeconds = recorder.state === "recording" ? recorder.seconds : null;
  useEffect(() => {
    listeningRef.current?.(
      listeningSeconds === null
        ? null
        : {
            seconds: listeningSeconds,
            onStop: () => {
              finishRef.current();
            },
            onCancel: () => {
              cancelRef.current();
            },
          },
    );
  }, [listeningSeconds]);
  useEffect(
    () => () => {
      listeningRef.current?.(null);
    },
    [],
  );

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${String(Math.min(el.scrollHeight, COMPOSER_MAX_PX))}px`;
  };

  const submit = () => {
    const body = draft.trim();
    if (body === "" || locked) return;
    onSend(body, { voice: fromVoice });
    setDraft("");
    setFromVoice(false);
    if (ref.current !== null) ref.current.style.height = "auto";
  };

  const finishRecording = async () => {
    if (voice === undefined) return;
    const audio = await recorder.stop();
    if (audio === null) return;
    setTranscribing(true);
    setVoiceError(null);
    try {
      const text = (await voice.transcribe(audio)).trim();
      if (text !== "") {
        setDraft((current) => (current.trim() === "" ? text : `${current.trim()} ${text}`));
        setFromVoice(true);
      }
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el === null) return;
        autosize(el);
        el.focus();
      });
    } catch {
      setVoiceError("No pude transcribir el audio. Escríbelo o inténtalo de nuevo.");
    } finally {
      setTranscribing(false);
    }
  };

  useEffect(() => {
    finishRef.current = () => {
      void finishRecording();
    };
    cancelRef.current = recorder.cancel;
  });

  const canSend = draft.trim() !== "" && !locked && !transcribing;
  // Sin soporte el micrófono también se pinta: al pulsarlo dice por qué no dicta.
  const showMic = voice !== undefined && !locked;
  const micUnavailable = problem !== null;

  return (
    <div className={className}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={cn(
          "glass flex items-end gap-1.5 rounded-[26px] py-2 pr-2 pl-[18px] transition-[border-color,box-shadow]",
          "focus-within:border-accent-violet/30 focus-within:shadow-[var(--shadow-float),0_0_0_4px_color-mix(in_srgb,var(--axi-violet)_8%,transparent)]",
          dimmed && "opacity-55",
        )}
      >
        {recording ? (
          <div className="flex min-h-9 flex-1 items-center gap-3 py-1" role="status" aria-live="polite">
            <span className="size-2.5 flex-none animate-pulse rounded-full bg-foreground" aria-hidden="true" />
            <span className="text-[13px] font-semibold tabular-nums">
              {recorder.state === "requesting" ? "Un momento…" : formatSeconds(recorder.seconds)}
            </span>
            <span className="assistant-wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="sr-only">Te escucho</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={recorder.cancel}
              className="px-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <textarea
            ref={ref}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (event.target.value === "") setFromVoice(false);
              autosize(event.target);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
            }}
            rows={1}
            /* CONSTANTE a propósito: es la invariante de `useTypewriterPlaceholder`. */
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={locked}
            style={{ maxHeight: COMPOSER_MAX_PX }}
            className={cn(
              "min-h-9 w-full flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-[1.45] outline-none",
              "placeholder:text-foreground/45 disabled:opacity-60",
            )}
          />
        )}

        {showMic && !recording ? (
          <button
            type="button"
            onClick={() => {
              setMicTried(true);
              recorder.start();
            }}
            disabled={transcribing}
            aria-label="Dictar respuesta"
            className={cn(
              "inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              micUnavailable
                ? "text-muted-foreground/70 hover:text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            )}
          >
            {transcribing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : micUnavailable ? (
              <MicOff className="size-4" aria-hidden="true" />
            ) : (
              <Mic className="size-4" aria-hidden="true" />
            )}
            <span aria-hidden="true">{transcribing ? "Transcribiendo" : "Dictar"}</span>
          </button>
        ) : null}

        {recording ? (
          <button
            type="button"
            onClick={() => {
              void finishRecording();
            }}
            aria-label="Detener y transcribir"
            className={cn(ROUND, "assistant-send")}
          >
            <Square className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Enviar"
            className={cn(ROUND, "assistant-send disabled:opacity-45 disabled:shadow-none")}
          >
            <ArrowUp className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </form>

      {after}

      {fromVoice && draft.trim() !== "" ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Mic className="size-3" aria-hidden="true" />
          Lo dicté yo · revísalo antes de enviar
        </p>
      ) : null}
      {/* Siempre montado: el motivo se ANUNCIA al aparecer (una región que nace
          con su texto no se lee). Vacío si no hay nada que decir. */}
      {/* Sin `display:none` cuando está vacío: una región oculta así sale del árbol
          de accesibilidad y su texto nuevo no se anunciaría. Vacía no ocupa alto. */}
      <p
        className={cn(
          "text-center text-[11.5px] [&:not(:empty)]:mt-2",
          voiceError !== null ? "text-destructive" : "text-muted-foreground",
        )}
        role="status"
        aria-live="polite"
      >
        {voiceError ??
          (problem !== null && onVoiceProblem === undefined
            ? `${VOICE_PROBLEM_COPY[problem].title}. ${VOICE_PROBLEM_COPY[problem].body}`
            : "")}
      </p>

      {footer}
    </div>
  );
}

const ROUND =
  "grid size-9 flex-none place-items-center rounded-full transition-[background-color,filter,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}
