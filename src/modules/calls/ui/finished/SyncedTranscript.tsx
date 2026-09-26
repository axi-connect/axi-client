"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/core/lib/utils";
import type { CallEventItem, CallTranscriptSegment } from "@/modules/calls/domain/call";
import { activeWordIndex, type SegmentWindow } from "@/modules/calls/domain/recording-sync";
import { LatencyBadge, agentTurnLatencies } from "@/modules/calls/ui/components/LatencyBadge";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";

const ROLE_DOT: Record<CallTranscriptSegment["role"], string> = {
  agent: "bg-accent-violet",
  caller: "bg-brand",
  system: "bg-muted-foreground",
};
const ROLE_DECORATION: Record<CallTranscriptSegment["role"], string> = {
  agent: "decoration-accent-violet",
  caller: "decoration-brand",
  system: "decoration-muted-foreground",
};

/**
 * La conversación de una llamada terminada, sincronizada con su grabación
 * (canvas, tablero 6). Cada frase es un botón que salta el audio ahí; la que
 * suena se resalta y su palabra actual va subrayada en el color de quien
 * habla (el texto sigue en tinta: AA). La latencia de cada turno del agente
 * queda en su badge, al lado y fuera del botón (nada interactivo anidado).
 * Sin grabación, es la misma lista sin saltos.
 */
export function SyncedTranscript({
  segments,
  events,
  windows,
  activeIndex,
  positionMs,
  playing,
  onSeek,
  names,
}: {
  segments: readonly CallTranscriptSegment[];
  events: readonly CallEventItem[];
  windows: readonly SegmentWindow[] | null;
  activeIndex: number;
  positionMs: number;
  playing: boolean;
  onSeek: ((ms: number) => void) | null;
  names: { agent: string; caller: string };
}) {
  const latencies = agentTurnLatencies(segments, events);
  const activeRef = useRef<HTMLLIElement | null>(null);

  // Mientras suena, la frase activa no se sale de la vista.
  useEffect(() => {
    if (playing) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [playing, activeIndex]);

  return (
    <section aria-label="La conversación" className="rounded-3xl border border-border bg-card p-3 sm:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-1 pb-2">
        <h2 className="text-sm font-semibold">La conversación</h2>
        {onSeek !== null && (
          <p className="text-xs text-muted-foreground">Toca una frase para escucharla</p>
        )}
      </header>

      {segments.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">
          Esta llamada no tiene conversación: no hubo diálogo con el agente.
        </p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {segments.map((segment, index) => {
            const active = index === activeIndex;
            const window = windows?.[index];
            const latency = latencies.get(segment.seq);
            const name =
              segment.role === "agent" ? names.agent : segment.role === "caller" ? names.caller : "Axi";
            const clock = formatCallClock(
              Math.round((window?.start ?? segment.spoken_at_ms ?? segment.at_ms) / 1000),
            );
            const words = segment.text.split(/\s+/).filter((word) => word !== "");
            const wordIndex = active && window !== undefined ? activeWordIndex(segment.text, window, positionMs) : -1;

            const body = (
              <>
                <span className="pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{clock}</span>
                <span className="block min-w-0">
                  <span className={cn("flex items-center gap-1.5 text-xs font-semibold", latency !== undefined && "pr-16")}>
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", ROLE_DOT[segment.role])} />
                    {name}
                    {segment.interrupted && (
                      <span className="font-normal text-muted-foreground">· interrumpida</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-sm leading-relaxed text-pretty",
                      segment.role === "system" ? "text-muted-foreground" : active ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {wordIndex < 0
                      ? segment.text
                      : words.map((word, i) => (
                          <span key={i}>
                            {i > 0 && " "}
                            <span
                              className={cn(
                                i === wordIndex && "font-medium underline decoration-2 underline-offset-4",
                                i === wordIndex && ROLE_DECORATION[segment.role],
                              )}
                            >
                              {word}
                            </span>
                          </span>
                        ))}
                  </span>
                </span>
              </>
            );

            return (
              <li
                key={segment.seq}
                ref={active ? activeRef : undefined}
                className={cn("relative rounded-2xl transition-colors", active && "bg-muted")}
              >
                {onSeek !== null && window !== undefined ? (
                  <button
                    type="button"
                    onClick={() => onSeek(window.start)}
                    aria-current={active ? "true" : undefined}
                    className="grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 px-3 py-2.5">{body}</div>
                )}
                {latency !== undefined && (
                  <span className="absolute top-2.5 right-3">
                    <LatencyBadge latency={latency} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
