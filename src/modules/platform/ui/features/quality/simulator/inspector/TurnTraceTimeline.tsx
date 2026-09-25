"use client";

/**
 * «¿Por qué respondió esto?» como línea de tiempo (quality_premium_plan F2):
 * tres cifras arriba (turnos, tools, correcciones) y un nodo por turno del
 * agente —modelo, latencia, tokens, iteraciones con sus tools y su resultado,
 * el nudge que descartó precios sin respaldo— y una fila compacta por
 * clasificación de intención. Fuente: el sink Redis de la sesión. El tono de
 * cada tool va en su icono; el texto queda en foreground (AA).
 */
import { CircleAlert, CircleCheck, CircleX, Route, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatLatency, formatTokens, type SessionTrace, type SessionTraceTurn } from "../../../../../domain/quality-sessions";
import { EmptyState } from "../../../../components/EmptyState";
import { TonePill } from "../../shared/premium";

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted px-3 py-2.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl leading-none font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function TurnTraceTimeline({ trace, loading }: { trace: SessionTrace | undefined; loading: boolean }) {
  if (loading && !trace) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }
  if (!trace || trace.turns.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="Sin traza todavía"
        description={
          trace?.source === "none"
            ? "La traza de esta sesión no está disponible (Redis no respondió o la sesión fue purgada)."
            : "La traza del turno aparece cuando el agente responde por primera vez. Los toques sys: se resuelven sin LLM y no dejan turno."
        }
      />
    );
  }

  const turns = trace.turns.filter((entry): entry is SessionTraceTurn => entry.kind === "agent_turn");
  const tools = turns.reduce((sum, turn) => sum + turn.iterations.reduce((acc, iteration) => acc + iteration.tools.length, 0), 0);
  const nudges = turns.reduce((sum, turn) => sum + turn.iterations.filter((iteration) => iteration.nudge_reason).length, 0);

  let turnIndex = 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Counter label="Turnos" value={turns.length} />
        <Counter label="Tools" value={tools} />
        <Counter label="Correcciones" value={nudges} />
      </div>
      <ol className="space-y-4">
        {trace.turns.map((entry, index) => {
          const last = index === trace.turns.length - 1;
          if (entry.kind === "intent_classification") {
            return (
              <TimelineItem key={`${entry.ts}-${index}`} last={last} muted>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    Intención → <span className="font-mono">{entry.result?.code ?? "sin señal"}</span>
                    {entry.result && <span className="text-muted-foreground tabular-nums"> · {entry.result.confidence.toFixed(2)}</span>}
                    <span className="text-muted-foreground"> · {entry.applied}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{formatLatency(entry.duration_ms)}</span>
                </div>
              </TimelineItem>
            );
          }
          turnIndex += 1;
          return (
            <TimelineItem key={`${entry.ts}-${index}`} last={last} failed={entry.failed}>
              <TurnBody turn={entry} index={turnIndex} />
            </TimelineItem>
          );
        })}
      </ol>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        La traza se guarda por conversación mientras es simulada, aunque el tracing global esté apagado. Dura 24 h.
      </p>
    </div>
  );
}

function TimelineItem({
  children,
  last,
  muted = false,
  failed = false,
}: {
  children: React.ReactNode;
  last: boolean;
  muted?: boolean;
  failed?: boolean;
}) {
  return (
    <li className="relative min-w-0 pl-6">
      {!last && <span aria-hidden="true" className="absolute top-5 -bottom-4 left-[7px] w-px bg-border" />}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 left-0 size-[15px] rounded-full border-2 bg-card",
          failed ? "border-destructive" : muted ? "border-muted-foreground/60" : "border-foreground",
        )}
      />
      {children}
    </li>
  );
}

function TurnBody({ turn, index }: { turn: SessionTraceTurn; index: number }) {
  return (
    <div className="min-w-0 space-y-2 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">
          Turno {index} · <span className="tabular-nums">{turn.ts ? TIME.format(new Date(turn.ts)) : "—"}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {turn.failed && <TonePill tone="destructive">falló</TonePill>}
          <span className="text-sm font-medium tabular-nums">{formatLatency(turn.duration_ms)}</span>
        </span>
      </div>
      <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground tabular-nums">
        {turn.model && <span className="whitespace-nowrap">{turn.model}</span>}
        <span className="whitespace-nowrap">
          {formatTokens(turn.tokens_total.input)} → {formatTokens(turn.tokens_total.output)} tokens
        </span>
        {turn.tokens_total.cached > 0 && <span className="whitespace-nowrap">caché {formatTokens(turn.tokens_total.cached)}</span>}
        {turn.context_ms !== null && <span className="whitespace-nowrap">ctx {formatLatency(turn.context_ms)}</span>}
        <span className="whitespace-nowrap">
          {turn.iterations.length} {turn.iterations.length === 1 ? "iteración" : "iteraciones"}
        </span>
        {turn.intention && (
          <span className="whitespace-nowrap">
            intención <span className="font-mono">{turn.intention.code}</span>
          </span>
        )}
      </p>

      {turn.iterations.map((iteration, iterationIndex) => (
        <div key={iterationIndex} className="space-y-1">
          {turn.iterations.length > 1 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Iteración {iterationIndex + 1} · {iteration.finish_reason}
              {iteration.latency_ms !== null && ` · ${formatLatency(iteration.latency_ms)}`}
            </p>
          )}
          {iteration.tools.map((tool, toolIndex) => (
            <div key={toolIndex} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted px-2.5 py-1.5">
              {tool.ok === false ? (
                <CircleX aria-label="Error" className="size-3.5 shrink-0 text-destructive" />
              ) : tool.productive === false ? (
                <CircleAlert aria-label="No productiva" className="size-3.5 shrink-0 text-warning" />
              ) : (
                <CircleCheck aria-label="Correcta" className="size-3.5 shrink-0 text-success" />
              )}
              <span className="shrink-0 font-mono font-medium">{tool.name}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={tool.unproductive_reason ?? tool.args ?? undefined}>
                {tool.unproductive_reason ?? tool.args ?? ""}
              </span>
              {tool.duration_ms !== null && <span className="shrink-0 text-muted-foreground tabular-nums">{formatLatency(tool.duration_ms)}</span>}
            </div>
          ))}
          {iteration.nudge_reason && (
            <p className="flex items-start gap-2 rounded-xl bg-muted px-2.5 py-1.5 leading-relaxed">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <span>
                {iteration.nudge_reason === "unverified_prices"
                  ? `Citó un precio sin respaldo: se descartó y reintentó${iteration.unverified_prices.length ? ` (${iteration.unverified_prices.join(", ")})` : ""}.`
                  : "Prometió sin actuar: se le pidió ejecutar la acción."}
              </span>
            </p>
          )}
          {iteration.assistant_text && iteration.tools.length === 0 && (
            <p className="line-clamp-3 text-foreground/90">«{iteration.assistant_text}»</p>
          )}
        </div>
      ))}

      {(turn.escalate_reason || turn.close_reason || turn.bot_phrases.length > 0 || turn.error) && (
        <div className="flex flex-wrap gap-1.5">
          {turn.escalate_reason && <TonePill tone="warning">escaló: {turn.escalate_reason}</TonePill>}
          {turn.close_reason && <TonePill tone="neutral">cerró: {turn.close_reason}</TonePill>}
          {turn.bot_phrases.length > 0 && <TonePill tone="warning">muletillas: {turn.bot_phrases.join(", ")}</TonePill>}
          {turn.error && <TonePill tone="destructive">{turn.error}</TonePill>}
        </div>
      )}
    </div>
  );
}
