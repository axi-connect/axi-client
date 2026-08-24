"use client";

import { SegmentedControl } from "@/shared/components/ui/segmented";
import { PERIOD_LABELS, type DashboardPeriod } from "@/modules/dashboard/domain/dashboard";

const PERIODS: DashboardPeriod[] = ["today", "7d", "30d"];

/**
 * Selector de período (Hoy / 7 días / 30 días). Es un filtro, no unas pestañas:
 * la pastilla y la semántica de radiogroup las aporta `SegmentedControl`.
 */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onValueChange={onChange}
      label="Período de las métricas"
      size="sm"
      items={PERIODS.map((period) => ({ value: period, label: PERIOD_LABELS[period] }))}
    />
  );
}
