"use client";

import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  ANALYTICS_PERIODS,
  PERIOD_LABELS,
  type AnalyticsPeriod,
} from "@/modules/analytics/domain/analytics";

/**
 * Selector de período de Analíticas (7 / 30 / 90 días). Propio del módulo: el
 * del dashboard usa otra escala (hoy/7d/30d).
 */
export function AnalyticsPeriodSelector({
  value,
  onChange,
}: {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onValueChange={onChange}
      label="Período de las analíticas"
      size="sm"
      items={ANALYTICS_PERIODS.map((period) => ({
        value: period,
        label: PERIOD_LABELS[period],
      }))}
    />
  );
}
