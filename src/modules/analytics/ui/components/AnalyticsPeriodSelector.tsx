"use client";

import { cn } from "@/core/lib/utils";
import {
  ANALYTICS_PERIODS,
  PERIOD_LABELS,
  type AnalyticsPeriod,
} from "@/modules/analytics/domain/analytics";

/**
 * Selector de período de Analíticas (7 / 30 / 90 días). Propio del módulo:
 * el del dashboard usa otra escala (hoy/7d/30d). Segmented pill flotante.
 */
export function AnalyticsPeriodSelector({
  value,
  onChange,
}: {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Período de las analíticas"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 p-1"
    >
      {ANALYTICS_PERIODS.map((period) => {
        const active = period === value;
        return (
          <button
            key={period}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(period)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
