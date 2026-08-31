"use client";

import dynamic from "next/dynamic";
import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CardEmpty } from "@/shared/components/features/card-empty";
import { CHART_COLORS } from "@/modules/dashboard/ui/components/charts/chart-theme";
import { ChartSkeleton } from "@/modules/analytics/ui/AnalyticsSkeletons";
import { SectionError, sectionRefetching } from "./section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { FunnelDTO } from "@/modules/analytics/domain/analytics";

// Recharts solo en cliente: fuera del bundle inicial y sin SSR.
const AreaTrend = dynamic(
  () => import("@/modules/dashboard/ui/components/charts/AreaTrend").then((m) => m.AreaTrend),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function formatBucket(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/**
 * Card "Evolución del período": serie diaria conversaciones vs cierres ganados.
 * Cierres en violeta (serie de datos, no estado — DESIGN-SYSTEM §2.4).
 */
export function TrendCard({
  section,
  onRetry,
}: {
  section: Section<FunnelDTO>;
  onRetry: () => void;
}) {
  return (
    <DashboardCard title="Evolución del período">
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <ChartSkeleton />
      ) : section.data.series.length === 0 ? (
        <CardEmpty
          glyph="metrics"
          message="Aún no hay actividad en este período."
        />
      ) : (
        <div className={sectionRefetching(section)}>
          <AreaTrend
            data={section.data.series.map((point) => ({
              bucket: point.bucket,
              Conversaciones: point.conversations,
              "Cierres ganados": point.closed_won,
            }))}
            xKey="bucket"
            series={[
              { key: "Conversaciones", label: "Conversaciones", color: CHART_COLORS.brand },
              { key: "Cierres ganados", label: "Cierres ganados", color: CHART_COLORS.violet },
            ]}
            formatX={formatBucket}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: CHART_COLORS.brand }} />
              Conversaciones
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: CHART_COLORS.violet }} />
              Cierres ganados
            </span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
