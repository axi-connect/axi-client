"use client"

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react"
import { Loader2, Pause, Play } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { formatDuration } from "@/core/lib/format"

const PLAYBACK_RATES = [1, 1.5, 2] as const

/** Control externo del player (llamadas premium: la transcripción salta el audio). */
export type AudioPlayerControl = {
  /** Mueve la posición. Sin `src` aún, se aplica cuando cargue. */
  seek: (seconds: number) => void
  toggle: () => void
}

/**
 * Player de audio compartido (burbujas del inbox, preview del grabador de
 * voz, grabaciones de llamadas). Vivía en el inbox; se promovió a shared en
 * calls F4-B porque no depende de NADA del inbox: solo lucide + cn + format.
 * Controla un <audio> oculto: play/pause, barra seekable, tiempo y
 * velocidad. `src=null` + `onNeedSrc` = carga perezosa: el primer play pide
 * la URL firmada y reproduce al llegar.
 *
 * Opcionales (llamadas premium F2), sin efecto si no se pasan: `onTimeUpdate`
 * y `onPlayingChange` para quien sincroniza algo con el audio, y `controlRef`
 * para saltar a una posición desde fuera.
 */
export function AudioPlayerCore({
  src,
  loading = false,
  error = false,
  onNeedSrc,
  onError,
  outbound = false,
  className,
  onTimeUpdate,
  onPlayingChange,
  controlRef,
}: {
  src: string | null
  loading?: boolean
  error?: boolean
  onNeedSrc?: () => void
  /** El <audio> falló al cargar/reproducir `src` (p. ej. URL firmada vencida):
   * quien la provee puede pedir una fresca. */
  onError?: () => void
  outbound?: boolean
  className?: string
  onTimeUpdate?: (seconds: number) => void
  onPlayingChange?: (playing: boolean) => void
  controlRef?: Ref<AudioPlayerControl>
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlayRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rateIndex, setRateIndex] = useState(0)
  const pendingSeekRef = useRef<number | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onPlayingChangeRef = useRef(onPlayingChange)
  onTimeUpdateRef.current = onTimeUpdate
  onPlayingChangeRef.current = onPlayingChange

  useEffect(() => {
    onPlayingChangeRef.current?.(playing)
  }, [playing])

  // Cuando la URL llega tras un play perezoso, arranca solo.
  useEffect(() => {
    if (src && pendingPlayRef.current && audioRef.current) {
      pendingPlayRef.current = false
      void audioRef.current.play().catch(() => setPlaying(false))
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = PLAYBACK_RATES[rateIndex]
  }, [rateIndex, src])

  const togglePlay = () => {
    if (!src) {
      pendingPlayRef.current = true
      onNeedSrc?.()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => setPlaying(false))
    }
  }

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    const value = Math.max(0, seconds)
    if (!src || !audio) {
      pendingSeekRef.current = value
      setCurrentTime(value)
      onTimeUpdateRef.current?.(value)
      return
    }
    audio.currentTime = value
    setCurrentTime(value)
    onTimeUpdateRef.current?.(value)
  }

  useImperativeHandle(controlRef, () => ({ seek: seekTo, toggle: togglePlay }))

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(duration) || duration <= 0) return
    audio.currentTime = value
    setCurrentTime(value)
    onTimeUpdateRef.current?.(value)
  }

  const knownDuration = Number.isFinite(duration) && duration > 0
  const progress = knownDuration ? Math.min(100, (currentTime / duration) * 100) : 0
  // Tokens y no blanco fijo: la burbuja saliente es tinta (F2 D1) y en oscuro
  // la tinta es clara; con `text-white` el reproductor desaparecía.
  const tone = outbound ? "text-background" : "text-foreground"

  return (
    <div className={cn("flex w-60 max-w-full items-center gap-2.5", tone, className)} role="group" aria-label="Audio">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrentTime(0)
            onTimeUpdateRef.current?.(0)
          }}
          onError={() => {
            setPlaying(false)
            onError?.()
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime)
            onTimeUpdateRef.current?.(e.currentTarget.currentTime)
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration)
            if (pendingSeekRef.current !== null) {
              e.currentTarget.currentTime = pendingSeekRef.current
              pendingSeekRef.current = null
            }
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          className="hidden"
        />
      )}
      <button
        onClick={togglePlay}
        disabled={error}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          outbound ? "bg-background text-foreground" : "bg-foreground text-background",
          error && "opacity-50",
        )}
        aria-label={playing ? "Pausar audio" : "Reproducir audio"}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4 translate-x-px" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {/* Pista propia (4 px, continua) con el range nativo encima, transparente:
            el teclado y el lector siguen teniendo el control real. */}
        <div className="relative flex h-6 items-center rounded-full outline-offset-2 outline-ring has-[input:focus-visible]:outline-2">
          <div aria-hidden className={cn("h-1 w-full overflow-hidden rounded-full", outbound ? "bg-background/25" : "bg-foreground/12")}>
            <div className="h-full rounded-full bg-current" style={{ width: `${String(progress)}%` }} />
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
            style={{ left: `${String(progress)}%` }}
          />
        <input
          type="range"
          min={0}
          max={knownDuration ? duration : 0}
          step={0.1}
          value={currentTime}
          disabled={!src || !knownDuration}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="absolute inset-0 h-6 w-full cursor-pointer opacity-0 disabled:cursor-default"
          aria-label="Posición del audio"
          aria-valuetext={`${formatDuration(currentTime)} de ${formatDuration(duration)}`}
        />
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-75">
          <span className="tabular-nums">
            {formatDuration(currentTime)}
            {knownDuration ? ` / ${formatDuration(duration)}` : ""}
          </span>
          <button
            onClick={() => setRateIndex((index) => (index + 1) % PLAYBACK_RATES.length)}
            className="inline-flex h-6 min-w-9 items-center justify-center rounded-full bg-current/10 px-2 font-semibold tabular-nums hover:bg-current/15"
            aria-label={`Velocidad de reproducción ${PLAYBACK_RATES[rateIndex]}x`}
          >
            {PLAYBACK_RATES[rateIndex]}x
          </button>
        </div>
      </div>
    </div>
  )
}
