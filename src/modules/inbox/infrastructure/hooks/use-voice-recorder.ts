"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Grabación de nota de voz con MediaRecorder (F9). Estados:
 * idle → requesting (permiso) → recording → preview (escuchar antes de
 * enviar) → idle. `unsupported` si el navegador no tiene MediaRecorder;
 * `denied` si el usuario negó el micrófono. El backend transcodifica a
 * ogg/opus, así que el mime local (webm en Chrome/Firefox, mp4 en Safari)
 * solo importa para el preview.
 *
 * Existe otro `useVoiceRecorder` en `core/hooks/use-voice-recorder.ts`, el del
 * kit de asistente: devuelve el `Blob` para TRANSCRIBIRLO, sin preview ni URL.
 * Son homónimos a propósito y siguen separados: unificarlos es una tanda que
 * toca el inbox y su reproductor.
 */
export type VoiceRecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "preview"
  | "unsupported"
  | "denied"

export interface VoiceRecording {
  blob: Blob
  mime_type: string
  object_url: string
  duration_ms: number
}

export const MAX_RECORDING_MS = 5 * 60_000
const TIMER_TICK_MS = 250
/** F3: nivel del micrófono para las barras de la grabación. */
const LEVEL_TICK_MS = 100
export const LEVEL_HISTORY = 48

const PREFERRED_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]

function pickMime(): string | undefined {
  return PREFERRED_MIMES.find((mime) => MediaRecorder.isTypeSupported(mime))
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [recording, setRecording] = useState<VoiceRecording | null>(null)
  /** Últimos niveles (0–1) del micrófono de verdad, del más viejo al más nuevo. */
  const [levels, setLevels] = useState<number[]>([])
  const levelRef = useRef<{ context: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const discardRef = useRef(false)

  const supported =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const stopTracks = (recorder: MediaRecorder | null) => {
    // SIEMPRE apagar las pistas: sin esto el indicador de micrófono del
    // navegador queda encendido
    recorder?.stream.getTracks().forEach((track) => track.stop())
  }

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stopLevels = () => {
    const meter = levelRef.current
    if (!meter) return
    clearInterval(meter.timer)
    void meter.context.close().catch(() => undefined)
    levelRef.current = null
  }

  /**
   * AnalyserNode sobre el MISMO stream que graba: las barras son el nivel real
   * (RMS del dominio temporal), no una onda decorativa. Sin Web Audio (jsdom,
   * navegadores viejos) no hay barras y la grabación sigue igual.
   */
  const startLevels = (stream: MediaStream) => {
    const AudioContextCtor =
      typeof window !== "undefined"
        ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined
    if (!AudioContextCtor) return
    try {
      const context = new AudioContextCtor()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const timer = setInterval(() => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) {
          const centered = (sample - 128) / 128
          sum += centered * centered
        }
        // RMS de voz hablada ronda 0,02–0,3: se amplía para que se lea.
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 4)
        setLevels((current) => [...current.slice(-(LEVEL_HISTORY - 1)), level])
      }, LEVEL_TICK_MS)
      levelRef.current = { context, timer }
    } catch {
      levelRef.current = null
    }
  }

  const start = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported")
      return
    }
    setStatus("requesting")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus("denied")
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType: pickMime() })
    recorderRef.current = recorder
    chunksRef.current = []
    discardRef.current = false
    startedAtRef.current = Date.now()
    setElapsedMs(0)

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      stopTracks(recorder)
      clearTimer()
      stopLevels()
      if (discardRef.current) {
        setStatus("idle")
        return
      }
      const mimeType = recorder.mimeType || "audio/webm"
      const blob = new Blob(chunksRef.current, { type: mimeType })
      if (blob.size === 0) {
        setStatus("idle")
        return
      }
      setRecording({
        blob,
        mime_type: mimeType,
        object_url: URL.createObjectURL(blob),
        duration_ms: Date.now() - startedAtRef.current,
      })
      setStatus("preview")
    }

    recorder.start()
    setLevels([])
    startLevels(stream)
    setStatus("recording")
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      setElapsedMs(elapsed)
      // Tope duro de duración: se detiene solo y pasa a preview
      if (elapsed >= MAX_RECORDING_MS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop()
      }
    }, TIMER_TICK_MS)
  }, [supported])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
  }, [])

  const cancel = useCallback(() => {
    discardRef.current = true
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
    } else {
      setStatus("idle")
    }
  }, [])

  /** Descarta el preview (tras enviar o al borrar la nota). */
  const reset = useCallback(() => {
    setRecording((current) => {
      if (current) URL.revokeObjectURL(current.object_url)
      return null
    })
    setElapsedMs(0)
    setStatus("idle")
  }, [])

  // Desmontaje a mitad de grabación: apagar micrófono y timer
  useEffect(() => {
    return () => {
      discardRef.current = true
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      stopTracks(recorderRef.current)
      clearTimer()
      stopLevels()
    }
  }, [])

  return { status, supported, elapsedMs, levels, recording, start, stop, cancel, reset }
}
