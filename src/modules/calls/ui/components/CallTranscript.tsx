"use client";

import { Flag, Wrench } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatDuration } from "@/core/lib/format";
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
 * Transcript por turnos con la latencia DESCOMPUESTA de cada turno del agente.
 * La correlación segmento↔latencia es posicional: el n-ésimo turno del agente
 * corresponde al n-ésimo evento `turn_completed` (ambos se escriben en orden).
 */
export function CallTranscript({
  segments,
  events,
  agentName,
  contactName,
}: {
  segments: CallTranscriptSegment[];
  events: CallEventItem[];
  agentName: string | null;
  contactName: string | null;
}) {
  const latencies = events
    .filter((event) => event.type === "turn_completed")
    .map((event) => parseTurnLatency(event.payload));

  let agentTurnIndex = -1;
  return (
    <ol className="space-y-3" aria-label="Transcript de la llamada">
      {segments.map((segment) => {
        const isAgent = segment.role === "agent";
        if (isAgent) agentTurnIndex += 1;
        const latency = isAgent ? (latencies[agentTurnIndex] ?? null) : null;

        if (segment.role === "system") {
          return (
            <li key={segment.seq} className="flex items-start gap-2.5">
              <span className="border-border text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border">
                <Flag className="size-3" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium">
                  Sistema · {formatDuration(Math.round(segment.at_ms / 1000))}
                </p>
                <p className="text-muted-foreground mt-0.5 text-sm">{segment.text}</p>
              </div>
            </li>
          );
        }

        return (
          <li key={segment.seq} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                isAgent
                  ? "bg-accent-violet/15 text-accent-violet"
                  : "bg-foreground/10 text-foreground",
              )}
              aria-hidden
            >
              {initials(isAgent ? agentName : contactName, isAgent ? "IA" : "C")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {isAgent ? (agentName ?? "Agente") : (contactName ?? "Cliente")}
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  {formatDuration(Math.round(segment.at_ms / 1000))}
                </span>
                {segment.interrupted && isAgent && (
                  <span className="text-warning ml-2 font-normal">interrumpido</span>
                )}
              </p>
              <div className="mt-0.5 flex items-start gap-2">
                <p
                  className={cn(
                    "border-border min-w-0 rounded-lg border px-3 py-2 text-sm",
                    isAgent ? "bg-accent-violet/5" : "bg-secondary",
                  )}
                >
                  {segment.text}
                </p>
                {latency !== null && <LatencyBadge latency={latency} />}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Badge con el desglose §3.4: la palanca correctiva se elige por el
 * SEGMENTO culpable, nunca por el total — por eso el popover. */
function LatencyBadge({ latency }: { latency: TurnLatency }) {
  const total = latency.total_turn_ms ?? latency.first_response_ms;
  if (total === undefined) return null;
  const slow = total >= SLOW_TURN_MS;

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
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums",
          slow
            ? "border-warning/40 bg-warning/10 text-warning"
            : "border-border text-muted-foreground",
        )}
        aria-label="Ver desglose de latencia del turno"
      >
        {(total / 1000).toFixed(1)} s
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

function initials(name: string | null, fallback: string): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || fallback;
}
