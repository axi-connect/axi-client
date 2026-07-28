"use client";

/**
 * Card del dashboard: top 5 agentes en peor salud (7 días). Query propia —
 * si falla, su ProblemAlert es inline y no tumba el resto del dashboard.
 * Reutiliza MetricCell/thresholds (misma semántica que el triage).
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DEFAULT_ANALYTICS_PERIOD } from "../../../domain/analytics";
import { failureRateTone, scoreTone } from "../../../domain/thresholds";
import { useAgentsHealthQuery } from "../../../infrastructure/api/hooks/use-analytics";
import { DegradedBanner } from "../../components/DegradedBanner";
import { ProblemAlert } from "../../components/ProblemAlert";
import { formatPct, formatScore } from "../analytics/analytics-format";
import { MetricCell } from "../analytics/MetricCell";

export function AgentsHealthSummaryCard() {
  const { data, isPending, isError, error, refetch } = useAgentsHealthQuery(DEFAULT_ANALYTICS_PERIOD);
  const top = (data?.agents ?? []).slice(0, 5);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Agentes en peor salud</h2>
        <span className="text-xs text-muted-foreground">últimos 7 días</span>
      </header>

      {data?.degraded && <DegradedBanner />}

      {isPending ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad de agentes.</p>
      ) : (
        <ul className="flex-1 space-y-2">
          {top.map((agent) => (
            <li key={agent.agent_id} className="flex items-center justify-between gap-3 text-sm">
              <Link
                href={`/platform/tenants/${agent.company_id}`}
                prefetch={false}
                className="min-w-0 truncate transition-colors hover:text-brand"
              >
                <span className="font-medium">{agent.agent_name}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {agent.company_name ?? `${agent.company_id.slice(0, 8)}…`}
                </span>
              </Link>
              <span className="flex shrink-0 items-center gap-3">
                <MetricCell tone={failureRateTone(agent.failure_rate_pct)}>
                  {formatPct(agent.failure_rate_pct)}
                </MetricCell>
                <MetricCell tone={scoreTone(agent.avg_overall_score)}>
                  {formatScore(agent.avg_overall_score)}
                </MetricCell>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="ghost" size="sm" className="self-end">
        <Link href="/platform/analytics">
          Ver triage
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
