"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grabar una nota de voz con el micrófono del navegador (`MediaRecorder`) y
 * devolverla como `Blob` para que quien la pida haga con ella lo que necesite
 * (hoy: transcribirla y dejar el texto en el compositor del kit de asistente).
 *
 * Tres decisiones del hook:
 *
 * 1. **El permiso se pide al PULSAR, no al montar.** Un diálogo de micrófono
 *    nada más abrir una pantalla es la forma más rápida de que alguien la cierre.
 * 2. **Las pistas se cierran siempre** (`stop()` en cada una), incluso si el
 *    componente se desmonta a media grabación. Sin eso el indicador de
 *    micrófono activo se queda encendido y la gente lo nota — y con razón.
 * 3. **`unsupported` es un estado, no un error.** Si el navegador no graba, el
 *    botón no se pinta y la entrada de texto sigue funcionando igual. El
 *    dictado es un acelerador, nunca la única puerta.
 *
 * Hay un segundo grabador en `modules/inbox/infrastructure/hooks/use-voice-recorder.ts`
 * (nota de voz que se ENVÍA como audio: añade `preview`, `object_url`,
 * `mime_type` y `duration_ms`). Siguen separados a propósito: este devuelve el
 * audio para transcribirlo y aquel gestiona una escucha previa; unificarlos es
 * una tanda propia que toca el inbox. El argumento de producto sobre la voz en
 * LATAM vive en `docs/plans/conversational_intake_plan.md` del servidor.
 */

export type RecorderState = "idle" | "requesting" | "recording" | "unsupported" | "denied";

export interface VoiceRecorder {
  state: RecorderState;
  /** Segundos grabados, para el contador del botón. */
  seconds: number;
  start: () => void;
  /** Cierra la grabación y devuelve el audio, o `null` si no hubo nada. */
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

/** Tope duro: una entrevista se contesta en frases, no en monólogos. */
const MAX_SECONDS = 120;

export function useVoiceRecorder(enabled: boolean): VoiceRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const release = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
    recorderRef.current = null;
    setSeconds(0);
  }, []);

  // Desmontar a media grabación no puede dejar el micrófono abierto.
  useEffect(() => release, [release]);

  useEffect(() => {
    if (!enabled) {
      setState("unsupported");
      return;
    }
    const supported =
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      navigator.mediaDevices !== undefined;
    setState(supported ? "idle" : "unsupported");
  }, [enabled]);

  const start = useCallback(() => {
    if (state !== "idle") return;
    setState("requesting");

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        chunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.start();
        recorderRef.current = recorder;
        setState("recording");
        setSeconds(0);

        timerRef.current = window.setInterval(() => {
          setSeconds((current) => {
            // El tope se aplica solo: quien se pasa de dos minutos no va a
            // estar mirando el contador.
            if (current + 1 >= MAX_SECONDS) recorder.stop();
            return current + 1;
          });
        }, 1000);
      })
      .catch(() => {
        // Denegado o sin dispositivo: el compositor de texto sigue ahí.
        setState("denied");
        release();
      });
  }, [state, release]);

  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (recorder === null || recorder.state === "inactive") {
      release();
      setState("idle");
      return Promise.resolve(null);
    }

    return new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        release();
        setState("idle");
        // Menos de medio segundo es un toque accidental, no una nota de voz.
        resolve(chunks.length === 0 ? null : new Blob(chunks, { type: recorder.mimeType }));
      };
      recorder.stop();
    });
  }, [release]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder !== null && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    chunksRef.current = [];
    release();
    setState("idle");
  }, [release]);

  return { state, seconds, start, stop, cancel };
}
