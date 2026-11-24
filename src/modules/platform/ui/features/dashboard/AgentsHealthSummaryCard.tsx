"use client";

/**
 * Tarjeta del Inicio: los 5 agentes en peor salud de los últimos 7 días.
 * Query propia: si falla, su error va dentro y no tumba el resto. Las dos
 * cifras llevan su rótulo («de fallos», «puntaje») y el punto del semáforo del
 * triage (`domain/thresholds.ts`, la misma semántica).
 */
import Link from "next/link";
import { DEFAULT_ANALYTICS_PERIOD } from "../../../domain/analytics";
import { failureRateTone, scoreTone } from "../../../domain/thresholds";
import { useAgentsHealthQuery } from "../../../infrastructure/api/hooks/use-analytics";
import { DegradedBanner } from "../../components/DegradedBanner";
import { QueryBoundary } from "../../components/QueryBoundary";
import { formatPct, formatScore } from "../analytics/analytics-format";
import { MetricCell } from "../analytics/MetricCell";
import { ListSkeleton, ListTile, Monogram, monogramOf } from "./parts";

export function AgentsHealthSummaryCard() {
  const query = useAgentsHealthQuery(DEFAULT_ANALYTICS_PERIOD);

  return (
    <ListTile
      label="Agentes en peor salud"
      aside="7 días"
      footNote="Últimos 7 días"
      footHref="/platform/analytics"
      footLabel="Ver triage"
    >
      {query.data?.degraded ? <DegradedBanner className="mb-3" /> : null}
      <QueryBoundary
        query={query}
        isEmpty={(data) => data.agents.length === 0}
        loading={<ListSkeleton rows={3} />}
        empty={<p className="py-6 text-center text-sm text-muted-foreground">Sin actividad de agentes.</p>}
      >
        {(data) => (
          <ul className="flex flex-col">
            {data.agents.slice(0, 5).map((agent) => (
              <li key={agent.agent_id} className="border-t border-border-soft first:border-t-0">
                <Link
                  href={`/platform/tenants/${agent.company_id}`}
                  prefetch={false}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 rounded-lg py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Monogram text={monogramOf(agent.agent_name)} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{agent.agent_name}</span>
                      <span className="truncate text-xs text-muted-foreground" title={agent.company_id}>
                        {agent.company_name ?? "Empresa sin nombre"}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5 text-sm">
                    <MetricCell appearance="dot" tone={failureRateTone(agent.failure_rate_pct)}>
                      {formatPct(agent.failure_rate_pct)}
                    </MetricCell>
                    <span className="text-xs text-muted-foreground">de fallos</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5 text-sm">
                    <MetricCell appearance="dot" tone={scoreTone(agent.avg_overall_score)}>
                      {formatScore(agent.avg_overall_score)}
                    </MetricCell>
                    <span className="text-xs text-muted-foreground">puntaje</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </ListTile>
  );
}
