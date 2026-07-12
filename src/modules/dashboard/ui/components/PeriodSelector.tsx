"use client";

import { cn } from "@/core/lib/utils";
import { PERIOD_LABELS, type DashboardPeriod } from "@/modules/dashboard/domain/dashboard";

const PERIODS: DashboardPeriod[] = ["today", "7d", "30d"];

/**
 * Selector de período (Hoy / 7 días / 30 días). Segmented control sobre glass
 * ligero — es un control flotante, no una superficie de contenido.
 */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Período de las métricas"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 p-1"
    >
      {PERIODS.map((period) => {
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
