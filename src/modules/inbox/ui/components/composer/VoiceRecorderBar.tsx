"use client"

import { Loader2, SendHorizonal, Square, Trash2 } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { formatDuration } from "@/core/lib/format"
import { Button } from "@/shared/components/ui/button"
import type { useVoiceRecorder } from "@/modules/inbox/infrastructure/hooks/use-voice-recorder"
import { AudioPlayerCore } from "../media/AudioPlayerCore"

/**
 * Barra de grabación/preview de nota de voz (W3): sustituye la fila del
 * composer mientras se graba. Preview con el mismo player de las burbujas.
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
    return (
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={recorder.cancel} aria-label="Cancelar grabación">
          <Trash2 className="size-4 text-destructive" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span
            className={cn("size-2.5 rounded-full bg-destructive", "motion-safe:animate-pulse")}
            aria-hidden
          />
          <span aria-live="polite" className="tabular-nums">
            {formatDuration(recorder.elapsedMs / 1000)}
          </span>
          <span className="text-muted-foreground">Grabando…</span>
        </div>
        <Button type="button" size="icon" onClick={recorder.stop} aria-label="Detener grabación">
          <Square className="size-4" />
        </Button>
      </div>
    )
  }

  if (recorder.status === "preview" && recorder.recording) {
    return (
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={sending}
          onClick={recorder.reset}
          aria-label="Descartar nota de voz"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
        <div className="min-w-0 flex-1">
          <AudioPlayerCore src={recorder.recording.object_url} />
        </div>
        <Button type="button" size="icon" disabled={sending} onClick={onSend} aria-label="Enviar nota de voz">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
        </Button>
      </div>
    )
  }

  return null
}
