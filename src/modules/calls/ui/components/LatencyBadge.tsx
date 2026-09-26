"use client";

import { Wrench } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  parseTurnLatency,
  type CallEventItem,
  type CallTranscriptSegment,
  type TurnLatency,
} from "@/modules/calls/domain/call";
import { formatMs } from "@/modules/calls/ui/lib/call-format";

/** Umbral del badge ámbar: por encima el turno se sintió lento (plan §3.4). */
const SLOW_TURN_MS = 4_000;

/**
 * Latencia de cada turno del agente, por `seq` de su segmento. La correlación
 * es posicional: el n-ésimo turno del agente corresponde al n-ésimo evento
 * `turn_completed` (ambos se escriben en orden). Si no cuadran (un turno sin
 * segmento, un segmento sin turno), mejor ningún badge que badges corridos.
 */
export function agentTurnLatencies(
  segments: readonly CallTranscriptSegment[],
  events: readonly CallEventItem[],
): Map<number, TurnLatency> {
  const latencies = events
    .filter((event) => event.type === "turn_completed")
    .map((event) => parseTurnLatency(event.payload));
  const agentSegments = segments.filter((segment) => segment.role === "agent");
  const bySeq = new Map<number, TurnLatency>();
  if (latencies.length !== agentSegments.length) return bySeq;
  agentSegments.forEach((segment, index) => {
    const latency = latencies[index];
    if (latency !== undefined && latency !== null) bySeq.set(segment.seq, latency);
  });
  return bySeq;
}

/** Badge con el desglose §3.4: la palanca correctiva se elige por el
 * SEGMENTO culpable, nunca por el total — por eso el popover. */
export function LatencyBadge({ latency }: { latency: TurnLatency }) {
  const total = latency.total_turn_ms ?? latency.first_response_ms;
  if (total === undefined) return null;
  const slow = total >= SLOW_TURN_MS;
  const seconds = (total / 1000).toFixed(1).replace(".", ",");

  const rows: { label: string; ms: number | undefined; hot?: boolean }[] = [
    { label: "Cola del runtime", ms: latency.runtime_queue_ms },
    { label: "LLM · primer token", ms: latency.llm_first_token_ms },
    { label: "LLM · total", ms: latency.llm_total_ms },
    { label: "Tools", ms: latency.tool_ms, hot: (latency.tool_ms ?? 0) > total / 3 },
    { label: "Primera oración al relay", ms: latency.first_response_ms },
  ];

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-muted px-2 font-mono text-[11px] font-normal text-muted-foreground tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Respuesta en ${seconds} segundos${slow ? ", lenta" : ""}: ver el desglose`}
      >
        {slow && <span aria-hidden className="size-1.5 rounded-full bg-warning" />}
        {seconds} s
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-xs">
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
          Latencia del turno
        </p>
        <ul className="space-y-1.5">
          {rows.map(
            (row) =>
              row.ms !== undefined && (
                <li key={row.label} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-36 shrink-0">{row.label}</span>
                  <span className="bg-secondary h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        row.hot ? "bg-warning" : "bg-accent-violet",
                      )}
                      style={{ width: `${Math.min(100, (row.ms / total) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono tabular-nums">
                    {formatMs(row.ms)}
                  </span>
                </li>
              ),
          )}
          {(latency.tools ?? []).map((tool) => (
            <li key={tool.name} className="text-muted-foreground flex items-center gap-2 pl-4">
              <Wrench className="size-3 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono">{tool.name}</span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums">
                {formatMs(tool.ms)}
              </span>
            </li>
          ))}
          <li className="border-border flex items-center gap-2 border-t pt-1.5 font-medium">
            <span className="w-36 shrink-0">Total</span>
            <span className="min-w-0 flex-1" />
            <span className="w-16 shrink-0 text-right font-mono tabular-nums">
              {formatMs(total)}
            </span>
          </li>
        </ul>
        {latency.filler_sent && (
          <p className="text-muted-foreground mt-2 text-[11px]">
            Se reprodujo una frase puente mientras el turno se resolvía.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
