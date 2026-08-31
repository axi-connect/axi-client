"use client";

import dynamic from "next/dynamic";
import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CardEmpty } from "@/shared/components/features/card-empty";
import { CHART_COLORS } from "@/modules/dashboard/ui/components/charts/chart-theme";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { ConversationStatsDTO, DashboardPeriod } from "@/modules/dashboard/domain/dashboard";

// Recharts solo en cliente: fuera del bundle inicial y sin SSR.
const AreaTrend = dynamic(
  () => import("@/modules/dashboard/ui/components/charts/AreaTrend").then((m) => m.AreaTrend),
  { ssr: false, loading: () => <div className="h-[180px] animate-pulse rounded-xl bg-secondary" /> },
);

function formatBucket(iso: string, period: DashboardPeriod): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return period === "today"
    ? date.toLocaleTimeString("es-CO", { hour: "2-digit" })
    : date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/** Flujo de conversaciones — GET /inbox/stats: serie nuevas/resueltas + IA/humano. */
export function ConversationsFlowCard({
  section,
  period,
}: {
  section: Section<ConversationStatsDTO>;
  period: DashboardPeriod;
}) {
  if (section.status === "loading" || section.status === "idle") {
    return (
      <DashboardCard title="Flujo de conversaciones">
        <div className="h-52 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (section.status === "error" || section.data === null) {
    return (
      <DashboardCard title="Flujo de conversaciones">
        <p className="text-sm text-muted-foreground">
          {section.error ?? "No se pudo cargar el flujo."}
        </p>
      </DashboardCard>
    );
  }

  const stats = section.data;
  const hasData = stats.new_count > 0 || stats.resolved_count > 0;

  return (
    <DashboardCard title="Flujo de conversaciones">
      {hasData ? (
        <>
          <AreaTrend
            data={stats.series.map((point) => ({
              bucket: point.bucket,
              Nuevas: point.new,
              Resueltas: point.resolved,
            }))}
            xKey="bucket"
            series={[
              { key: "Nuevas", label: "Nuevas", color: CHART_COLORS.brand },
              { key: "Resueltas", label: "Resueltas", color: CHART_COLORS.violet },
            ]}
            formatX={(value) => formatBucket(value, period)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="font-semibold tabular-nums">{stats.new_count}</span>{" "}
              <span className="text-muted-foreground">nuevas</span>
            </span>
            <span>
              <span className="font-semibold tabular-nums">{stats.resolved_count}</span>{" "}
              <span className="text-muted-foreground">resueltas</span>
            </span>
            <span className="ml-auto flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: CHART_COLORS.brand }} />
                IA {stats.ai_resolved_pct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: CHART_COLORS.violet }} />
                Humano {stats.human_resolved_pct}%
              </span>
            </span>
          </div>
        </>
      ) : (
        <CardEmpty
          glyph="conversation"
          message="Aún no hay conversaciones en este período."
        />
      )}
    </DashboardCard>
  );
}
