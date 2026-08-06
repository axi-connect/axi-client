"use client";

import { cn } from "@/core/lib/utils";
import { Progress } from "@/shared/components/ui/progress";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import {
  HIGHLIGHTED_USAGE_METRICS,
  USAGE_METRIC_LABELS,
  type UsageSummaryDTO,
} from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { Gauge } from "lucide-react";

function MetricBar({
  label,
  used,
  limit,
  pct,
}: {
  label: string;
  used: number;
  limit: number | null;
  pct: number;
}) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString("es-CO")}
          {limit !== null && (
            <span className="text-muted-foreground"> / {limit.toLocaleString("es-CO")}</span>
          )}
        </span>
      </div>
      {limit !== null && (
        <Progress
          value={Math.min(pct, 100)}
          className={cn(pct >= 100 && "bg-destructive/20", pct >= 80 && pct < 100 && "bg-warning/25")}
        />
      )}
    </li>
  );
}

/** ¿Cuánto plan he consumido? — GET /usage/summary (billing_cycle). */
export function UsagePanel({ section }: { section: Section<UsageSummaryDTO> }) {
  if (section.status === "loading" || section.status === "idle") {
    return (
      <DashboardCard title="Consumo del plan">
        <div className="h-32 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (section.status === "error" || section.data === null) {
    return (
      <DashboardCard title="Consumo del plan">
        <p className="text-sm text-muted-foreground">
          {section.error ?? "No se pudo cargar el consumo."}
        </p>
      </DashboardCard>
    );
  }

  const summary = section.data;
  const highlighted = summary.metrics.filter(
    (metric) =>
      (HIGHLIGHTED_USAGE_METRICS as readonly string[]).includes(metric.metric) ||
      // La voz es opcional y de pago: se destaca solo cuando el tenant la
      // tiene contratada (límite propio) o ya consumió en el ciclo
      (metric.metric === "tts_characters" && (metric.limit !== null || metric.used > 0)),
  );

  return (
    <DashboardCard title="Consumo del plan">
      {highlighted.length === 0 ? (
        <CardEmpty
          icon={<Gauge aria-hidden className="size-6" />}
          message="Sin consumo registrado este ciclo."
        />
      ) : (
        <ul className="space-y-4">
          {highlighted.map((metric) => (
            <MetricBar
              key={metric.metric}
              label={USAGE_METRIC_LABELS[metric.metric] ?? metric.metric}
              used={metric.used}
              limit={metric.limit?.value ?? null}
              pct={metric.limit?.pct_used ?? 0}
            />
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Costo del ciclo</span>
        <span className="font-semibold tabular-nums">
          ${summary.cost.used_usd.toFixed(2)} USD
        </span>
      </div>
    </DashboardCard>
  );
}
