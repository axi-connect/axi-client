"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Grabación de nota de voz con MediaRecorder (F9). Estados:
 * idle → requesting (permiso) → recording → preview (escuchar antes de
 * enviar) → idle. `unsupported` si el navegador no tiene MediaRecorder;
 * `denied` si el usuario negó el micrófono. El backend transcodifica a
 * ogg/opus, así que el mime local (webm en Chrome/Firefox, mp4 en Safari)
 * solo importa para el preview.
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

const MAX_RECORDING_MS = 5 * 60_000
const TIMER_TICK_MS = 250

const PREFERRED_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]

function pickMime(): string | undefined {
  return PREFERRED_MIMES.find((mime) => MediaRecorder.isTypeSupported(mime))
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [recording, setRecording] = useState<VoiceRecording | null>(null)

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
    }
  }, [])

  return { status, supported, elapsedMs, recording, start, stop, cancel, reset }
}
