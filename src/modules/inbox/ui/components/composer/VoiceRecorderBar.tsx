"use client"

import { Loader2, SendHorizonal, Square, Trash2 } from "lucide-react"
import { formatDuration } from "@/core/lib/format"
import { Button } from "@/shared/components/ui/button"
import { LEVEL_HISTORY, MAX_RECORDING_MS, type useVoiceRecorder } from "@/modules/inbox/infrastructure/hooks/use-voice-recorder"
import { AudioPlayerCore } from "@/shared/components/features/audio-player"

/**
 * Grabar y escuchar la nota de voz sin salir de la caja (F3). Grabando: las
 * barras son el nivel real del micrófono, el tiempo en `tabular-nums`, y
 * Descartar (rojo, a la izquierda) queda lejos de Detener. Lista: el mismo
 * reproductor de las burbujas y Enviar en coral.
 */
export function VoiceRecorderBar({
  recorder,
  sending,
  onSend,
}: {
  recorder: ReturnType<typeof useVoiceRecorder>
  sending: boolean
  onSend: () => void
}) {
  if (recorder.status === "recording") {
    // Relleno a la izquierda para que las barras nuevas entren siempre por la derecha.
    const bars = [...Array.from({ length: Math.max(0, LEVEL_HISTORY - recorder.levels.length) }, () => 0), ...recorder.levels]
    return (
      <div className="flex items-center gap-3 px-2 py-2.5" role="group" aria-label="Grabando nota de voz">
        <Button type="button" variant="ghost" size="icon" className="size-9 rounded-full text-destructive" onClick={recorder.cancel} aria-label="Descartar la grabación">
          <Trash2 className="size-4" />
        </Button>
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse" />
        <span className="min-w-10 text-sm font-semibold tabular-nums" aria-live="off">
          {formatDuration(recorder.elapsedMs / 1000)}
        </span>
        <div aria-hidden className="flex h-7 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden">
          {bars.map((level, index) => (
            <span
              key={index}
              className="w-[3px] shrink-0 rounded-full bg-foreground"
              style={{ height: `${String(Math.max(3, Math.round(level * 28)))}px`, opacity: index < bars.length - 12 ? 0.35 : 0.85 }}
            />
          ))}
        </div>
        <span className="hidden text-xs whitespace-nowrap text-muted-foreground sm:inline">
          Grabando · máx. {String(MAX_RECORDING_MS / 60_000)} min
        </span>
        <Button type="button" variant="contrast" className="h-9 shrink-0 rounded-full px-3.5" onClick={recorder.stop} aria-label="Detener y escuchar">
          <Square className="size-3.5 fill-current" aria-hidden />
          Detener
        </Button>
      </div>
    )
  }

  if (recorder.status === "preview" && recorder.recording) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5" role="group" aria-label="Nota de voz lista">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full text-destructive"
          disabled={sending}
          onClick={recorder.reset}
          aria-label="Descartar la nota de voz"
        >
          <Trash2 className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <AudioPlayerCore src={recorder.recording.object_url} className="w-full" />
        </div>
        <Button type="button" className="h-9 shrink-0 rounded-full px-3.5" disabled={sending} onClick={onSend} aria-label="Enviar nota de voz">
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Enviar
          {!sending && <SendHorizonal className="size-4" aria-hidden />}
        </Button>
      </div>
    )
  }

  return null
}
