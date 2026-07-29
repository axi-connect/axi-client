"use client";

import dynamic from "next/dynamic";
import { UserPlus } from "lucide-react";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CHART_COLORS } from "@/modules/dashboard/ui/components/charts/chart-theme";
import {
  CONTACT_STAGE_LABELS,
  type ContactStatsDTO,
  type DashboardPeriod,
} from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";

const AreaTrend = dynamic(
  () => import("@/modules/dashboard/ui/components/charts/AreaTrend").then((m) => m.AreaTrend),
  { ssr: false, loading: () => <div className="h-[140px] animate-pulse rounded-xl bg-secondary" /> },
);

function formatBucket(iso: string, period: DashboardPeriod): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return period === "today"
    ? date.toLocaleTimeString("es-CO", { hour: "2-digit" })
    : date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/** Clientes nuevos (CRM) — GET /contacts/stats: serie de altas + reparto por etapa. */
export function NewCustomersCard({
  section,
  period,
}: {
  section: Section<ContactStatsDTO>;
  period: DashboardPeriod;
}) {
  if (section.status === "loading" || section.status === "idle") {
    return (
      <DashboardCard title="Clientes nuevos">
        <div className="h-44 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (section.status === "error" || section.data === null) {
    return (
      <DashboardCard title="Clientes nuevos">
        <p className="text-sm text-muted-foreground">
          {section.error ?? "No se pudieron cargar los clientes."}
        </p>
      </DashboardCard>
    );
  }

  const stats = section.data;
  const stages = Object.entries(stats.by_stage) as [
    keyof typeof stats.by_stage,
    number,
  ][];

  return (
    <DashboardCard title="Clientes nuevos">
      {stats.new_count > 0 ? (
        <>
          <AreaTrend
            data={stats.series.map((point) => ({ bucket: point.bucket, Nuevos: point.count }))}
            xKey="bucket"
            series={[{ key: "Nuevos", label: "Nuevos", color: CHART_COLORS.amber }]}
            formatX={(value) => formatBucket(value, period)}
            height={140}
          />
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{stats.new_count}</span>
            <span className="text-sm text-muted-foreground">nuevos en el período</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {stages.map(([stage, count]) => (
              <span key={stage}>
                {CONTACT_STAGE_LABELS[stage]}{" "}
                <span className="font-semibold tabular-nums text-foreground">{count}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <CardEmpty
          icon={<UserPlus aria-hidden className="size-6" />}
          message="Sin clientes nuevos en este período."
        />
      )}
    </DashboardCard>
  );
}
