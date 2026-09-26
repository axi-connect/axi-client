import { formatDuration } from "@/core/lib/format";
import { BentoTile } from "@/shared/components/features/bento";
import type { CallsOverviewDTO } from "@/modules/calls/domain/call";
import { previousCyclePhrase } from "./monitor-copy";

/**
 * «Este ciclo» (canvas, tablero 1): cuatro cifras de un tema — cuántas,
 * cuántas contestaron, cuántas cumplieron su objetivo y cuánto duran — cada
 * una con su línea de qué significa. Sin tendencias negativas (§7.1).
 */
export function CycleTile({ overview, className }: { overview: CallsOverviewDTO; className?: string }) {
  const { kpis, previous } = overview;
  const figures = [
    {
      label: "Llamadas",
      value: String(kpis.total),
      unit: undefined,
      note: `${kpis.outbound} salen · ${kpis.inbound} entran`,
    },
    {
      label: "Contestaron",
      value: String(kpis.answered),
      unit: `${kpis.connection_pct} %`,
      note: previousCyclePhrase(kpis.answered, previous.answered) ?? `${kpis.no_answer} sin respuesta`,
    },
    {
      label: "Objetivo cumplido",
      value: String(kpis.goal_met),
      unit: `${kpis.goal_met_pct} %`,
      note: previousCyclePhrase(kpis.goal_met, previous.goal_met) ?? "lo decide cada llamada",
    },
    {
      label: "Duración media",
      value: kpis.avg_duration_seconds === null ? "—" : formatDuration(kpis.avg_duration_seconds),
      unit: undefined,
      note: kpis.avg_duration_seconds === null ? "aún sin llamadas contestadas" : "minutos por llamada",
    },
  ];
  return (
    <BentoTile
      label="Este ciclo"
      aside={<span className="truncate text-xs text-muted-foreground">se cuentan las terminadas</span>}
      className={className}
    >
      <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={
              index % 2 === 1
                ? "flex min-w-0 flex-col gap-1.5 border-l border-border pl-4 sm:pl-5"
                : index === 2
                  ? "flex min-w-0 flex-col gap-1.5 sm:border-l sm:border-border sm:pl-5"
                  : "flex min-w-0 flex-col gap-1.5"
            }
          >
            <dt className="truncate text-xs text-muted-foreground">{figure.label}</dt>
            <dd className="flex items-baseline gap-1.5">
              <span className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">
                {figure.value}
              </span>
              {figure.unit !== undefined && <span className="text-sm text-muted-foreground">{figure.unit}</span>}
            </dd>
            <dd className="truncate text-xs text-muted-foreground" title={figure.note}>
              {figure.note}
            </dd>
          </div>
        ))}
      </dl>
    </BentoTile>
  );
}
