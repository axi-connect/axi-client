"use client";

/**
 * «¿Por qué respondió esto?»: una tarjeta por turno del agente (modelo,
 * latencia, tokens, iteraciones con sus tools y su resultado, el nudge que
 * descartó precios sin respaldo, la respuesta) y una fila compacta por
 * clasificación de intención. Fuente: el sink Redis de la sesión.
 */
import { CircleAlert, CircleCheck, CircleX, Compass, Route, TriangleAlert } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatLatency, formatTokens, type SessionTrace, type SessionTraceTurn } from "../../../../../domain/quality-sessions";
import { EmptyState } from "../../../../components/EmptyState";

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function TurnTraceTimeline({ trace, loading }: { trace: SessionTrace | undefined; loading: boolean }) {
  if (loading && !trace) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
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

  let turnIndex = 0;
  return (
    <ol className="space-y-2.5">
      <li>
        <p className="text-[11px] text-muted-foreground">
          Traza guardada por conversación mientras es simulada, aunque el tracing global esté apagado. 24 h de retención.
        </p>
      </li>
      {trace.turns.map((entry, index) => {
        if (entry.kind === "intent_classification") {
          return (
            <li key={`${entry.ts}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-secondary px-3 py-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Compass aria-hidden="true" className="size-3.5 text-muted-foreground" />
                Intención →{" "}
                <span className="font-mono">{entry.result?.code ?? "sin señal"}</span>
                {entry.result && <span className="tabular-nums text-muted-foreground">({entry.result.confidence.toFixed(2)})</span>}
                <span className="text-muted-foreground">· {entry.applied}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">{formatLatency(entry.duration_ms)}</span>
            </li>
          );
        }
        turnIndex += 1;
        return <TurnCard key={`${entry.ts}-${index}`} turn={entry} index={turnIndex} />;
      })}
    </ol>
  );
}

function TurnCard({ turn, index }: { turn: SessionTraceTurn; index: number }) {
  return (
    <li className="space-y-2 rounded-xl border border-border p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          Turno {index} · {turn.ts ? TIME.format(new Date(turn.ts)) : "—"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {turn.failed && <Badge variant="destructive">falló</Badge>}
          <Badge variant="outline">
            {turn.iterations.length} {turn.iterations.length === 1 ? "iteración" : "iteraciones"}
          </Badge>
        </span>
      </div>
      <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-muted-foreground tabular-nums">
        {turn.model && <span>{turn.model}</span>}
        <span>latencia {formatLatency(turn.duration_ms)}</span>
        <span>
          tokens {formatTokens(turn.tokens_total.input)} → {formatTokens(turn.tokens_total.output)}
        </span>
        {turn.tokens_total.cached > 0 && <span>caché {formatTokens(turn.tokens_total.cached)}</span>}
        {turn.context_ms !== null && <span>ctx {formatLatency(turn.context_ms)}</span>}
        {turn.intention && (
          <span>
            intención <span className="font-mono">{turn.intention.code}</span>
          </span>
        )}
      </p>

      {turn.iterations.map((iteration, iterationIndex) => (
        <div key={iterationIndex} className="space-y-1 border-l-2 border-border pl-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Iteración {iterationIndex + 1} · {iteration.finish_reason}
            {iteration.latency_ms !== null && ` · ${formatLatency(iteration.latency_ms)}`}
          </p>
          {iteration.tools.map((tool, toolIndex) => (
            <p key={toolIndex} className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              {tool.ok === false ? (
                <CircleX aria-label="Error" className="size-3.5 text-destructive" />
              ) : tool.productive === false ? (
                <CircleAlert aria-label="No productiva" className="size-3.5 text-warning" />
              ) : (
                <CircleCheck aria-label="Correcta" className="size-3.5 text-success" />
              )}
              <span className="font-semibold">{tool.name}</span>
              {tool.args && <span className="min-w-0 max-w-full truncate text-muted-foreground">{tool.args}</span>}
              {tool.unproductive_reason && <span className="text-warning">{tool.unproductive_reason}</span>}
              {tool.duration_ms !== null && (
                <span className="ml-auto font-sans text-muted-foreground tabular-nums">{formatLatency(tool.duration_ms)}</span>
              )}
            </p>
          ))}
          {iteration.nudge_reason && (
            <p className="inline-flex flex-wrap items-center gap-1.5 text-warning">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              {iteration.nudge_reason === "unverified_prices"
                ? `precio sin respaldo descartado y reintentado${iteration.unverified_prices.length ? `: ${iteration.unverified_prices.join(", ")}` : ""}`
                : "promesa sin acción: se le pidió actuar"}
            </p>
          )}
          {iteration.assistant_text && iteration.tools.length === 0 && (
            <p className="line-clamp-3 text-foreground/90">«{iteration.assistant_text}»</p>
          )}
        </div>
      ))}

      {(turn.escalate_reason || turn.close_reason || turn.bot_phrases.length > 0 || turn.error) && (
        <p className="flex flex-wrap gap-x-2 text-muted-foreground">
          {turn.escalate_reason && <span>escaló: {turn.escalate_reason}</span>}
          {turn.close_reason && <span>cerró: {turn.close_reason}</span>}
          {turn.bot_phrases.length > 0 && <span className="text-warning">muletillas: {turn.bot_phrases.join(", ")}</span>}
          {turn.error && <span className="text-destructive">{turn.error}</span>}
        </p>
      )}
    </li>
  );
}
