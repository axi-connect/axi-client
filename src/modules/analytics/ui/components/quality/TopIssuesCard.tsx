"use client";

import dynamic from "next/dynamic";
import { ListChecks } from "lucide-react";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { ChartSkeleton } from "@/modules/analytics/ui/AnalyticsSkeletons";
import { issueLabel } from "@/modules/analytics/domain/labels";
import { SectionError, sectionRefetching } from "../conversion/section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { IssuesTopDTO } from "@/modules/analytics/domain/analytics";

const BarStacked = dynamic(
  () =>
    import("@/modules/analytics/ui/components/charts/BarStacked").then((m) => m.BarStacked),
  { ssr: false, loading: () => <ChartSkeleton height={140} /> },
);

/**
 * Card "Problemas más frecuentes": top de issues apilado por severidad,
 * ordenado por prioridad (frecuencia × severidad, server-side). Clic en una
 * barra filtra la tabla de evaluaciones por ese `issue_code`.
 */
export function TopIssuesCard({
  section,
  onIssueClick,
  onRetry,
  className,
}: {
  section: Section<IssuesTopDTO>;
  onIssueClick: (issueCode: string) => void;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <DashboardCard title="Problemas más frecuentes" className={className}>
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <ChartSkeleton height={140} />
      ) : section.data.issues.length === 0 ? (
        <CardEmpty
          icon={<ListChecks aria-hidden className="size-6" />}
          message="Sin problemas detectados en el período. Buen trabajo."
        />
      ) : (
        <div className={sectionRefetching(section)}>
          <BarStacked
            data={section.data.issues.slice(0, 6).map((issue) => ({
              key: issue.code,
              label: issueLabel(issue.code),
              low: issue.by_severity.low ?? 0,
              medium: issue.by_severity.medium ?? 0,
              high: issue.by_severity.high ?? 0,
            }))}
            onBarClick={onIssueClick}
          />
          <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-muted-foreground/35" /> Leve
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-warning" /> Media
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-destructive" /> Alta
            </span>
            <span className="ml-auto hidden sm:inline">Clic en una barra para ver sus evaluaciones</span>
          </p>
        </div>
      )}
    </DashboardCard>
  );
}
