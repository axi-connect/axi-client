"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import type { CallTranscriptSegment } from "@/modules/calls/domain/call";
import {
  PLAYBACK_RATES,
  type PlaybackRate,
} from "@/modules/calls/infrastructure/hooks/use-recording-playback";
import { RecordingWaveform } from "@/modules/calls/ui/components/recording/RecordingWaveform";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";
import type { useSyncedRecording } from "./use-synced-recording";

const RATE_ITEMS = PLAYBACK_RATES.map((rate) => ({
  value: String(rate) as `${PlaybackRate}`,
  label: `${String(rate).replace(".", ",")}×`,
}));

const ROLE_TEXT: Record<CallTranscriptSegment["role"], string> = {
  agent: "text-accent-violet",
  caller: "text-brand",
  system: "text-muted-foreground",
};

/**
 * La grabación de una llamada terminada (canvas, tablero 6): una superficie
 * oscura (`.surface-dark`, no una isla — la isla de esta pantalla es «Así fue
 * la llamada», auditoría F5) con la onda de picos reales coloreada por quién
 * habla, el reloj en el color de quien suena, reproducir y velocidad. La onda
 * es la barra de posición.
 */
export function RecordingPanel({
  sync,
  segments,
  names,
}: {
  sync: ReturnType<typeof useSyncedRecording>;
  segments: readonly CallTranscriptSegment[];
  names: { agent: string; caller: string };
}) {
  const { playback, windows, durationMs, peaks, activeIndex, urlStatus } = sync;
  const active = activeIndex >= 0 ? segments[activeIndex] : undefined;
  const spans = windows.map((window, index) => ({
    start: window.start,
    end: window.end,
    role: segments[index]?.role ?? "system",
  }));
  const position = formatCallClock(Math.floor(playback.positionMs / 1000));
  const total = formatCallClock(Math.round(durationMs / 1000));

  return (
    <section
      aria-label="Grabación"
      className="surface-dark relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl bg-background p-5 text-foreground sm:p-6 dark:ring-1 dark:ring-border"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Grabación</h2>
        <ul aria-hidden className="flex items-center gap-4 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent-violet" />
            {names.agent} (IA)
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            {names.caller}
          </li>
        </ul>
      </header>

      <p aria-hidden className={cn("text-center font-mono text-sm tabular-nums", active ? ROLE_TEXT[active.role] : "text-muted-foreground")}>
        {position}
      </p>

      <RecordingWaveform
        peaks={peaks}
        spans={spans}
        positionMs={playback.positionMs}
        durationMs={durationMs}
        playing={playback.playing}
        onSeek={playback.seek}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="contrast"
            size="icon"
            className="size-12 rounded-full"
            onClick={playback.toggle}
            disabled={urlStatus === "error"}
            aria-label={playback.playing ? "Pausar la grabación" : "Escuchar la grabación"}
          >
            {urlStatus === "loading" && !playback.playing ? (
              <Loader2 aria-hidden className="size-5 animate-spin" />
            ) : playback.playing ? (
              <Pause aria-hidden className="size-5" />
            ) : (
              <Play aria-hidden className="size-5 translate-x-px" />
            )}
          </Button>
          <span className="font-mono text-sm tabular-nums">
            {position} <span className="text-muted-foreground">/ {total}</span>
          </span>
        </div>
        <SegmentedControl
          label="Velocidad de reproducción"
          size="sm"
          value={String(playback.rate) as `${PlaybackRate}`}
          onValueChange={(value) => playback.setRate(Number(value) as PlaybackRate)}
          items={RATE_ITEMS}
        />
      </div>

      {urlStatus === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          No pudimos cargar la grabación.
          <Button variant="contrast" size="sm" className="rounded-full" onClick={sync.retry}>
            Reintentar
          </Button>
        </div>
      )}
    </section>
  );
}
