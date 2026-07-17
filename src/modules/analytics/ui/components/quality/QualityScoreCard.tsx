"use client";

import { Sparkles } from "lucide-react";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PERIOD_LABELS, type AnalyticsPeriod } from "@/modules/analytics/domain/analytics";
import { scoreBand } from "@/modules/analytics/domain/labels";
import { ScoreRing } from "@/modules/analytics/ui/components/charts/ScoreRing";
import { SectionError, sectionRefetching } from "../conversion/section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { AgentPerformanceDTO } from "@/modules/analytics/domain/analytics";

/**
 * Score global ponderado client-side (Σ avg×evals / Σ evals — no hay endpoint
 * de promedio global y esto es exacto). Null si nadie tiene evaluaciones.
 */
export function weightedScore(dto: AgentPerformanceDTO): {
  score: number | null;
  evaluations: number;
} {
  let weighted = 0;
  let evaluations = 0;
  for (const agent of dto.agents) {
    if (agent.avg_overall_score === null || agent.evaluations === 0) continue;
    weighted += agent.avg_overall_score * agent.evaluations;
    evaluations += agent.evaluations;
  }
  return { score: evaluations > 0 ? weighted / evaluations : null, evaluations };
}

/** Card "Calidad general": ScoreRing + conteos + resumen de agentes. */
export function QualityScoreCard({
  section,
  period,
  onRetry,
  className,
}: {
  section: Section<AgentPerformanceDTO>;
  period: AnalyticsPeriod;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <DashboardCard title="Calidad general" className={className}>
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <div role="status" aria-label="Cargando calidad" className="flex items-center gap-4">
          <Skeleton className="size-28 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      ) : (
        (() => {
          const { score, evaluations } = weightedScore(section.data);
          if (score === null) {
            return (
              <CardEmpty
                icon={<Sparkles aria-hidden className="size-6" />}
                message="Aún no hay evaluaciones. Cada conversación cerrada se evalúa automáticamente para ayudarte a mejorar a tus agentes."
              />
            );
          }
          const evaluated = section.data.agents.filter(
            (agent) => agent.avg_overall_score !== null,
          );
          const wellCount = evaluated.filter(
            (agent) => scoreBand(agent.avg_overall_score ?? 0) === "good",
          ).length;
          const improveCount = evaluated.length - wellCount;
          return (
            <div className={sectionRefetching(section)}>
              <div className="flex flex-wrap items-center gap-5">
                <ScoreRing score={score} />
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">
                      {evaluations.toLocaleString("es-CO")}
                    </span>{" "}
                    evaluaciones · {PERIOD_LABELS[period]}
                  </p>
                  <p className="text-muted-foreground">
                    Agentes:{" "}
                    <span className="font-medium text-foreground">
                      {wellCount} bien
                    </span>
                    {improveCount > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-warning">
                          {improveCount} en zona de mejora
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </DashboardCard>
  );
}
