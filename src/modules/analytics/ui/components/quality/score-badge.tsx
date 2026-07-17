"use client";

import { cn } from "@/core/lib/utils";
import { scoreBand, type ScoreBand } from "@/modules/analytics/domain/labels";

const BAND_CLASSES: Record<ScoreBand, string> = {
  good: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

/** Badge de score con el semáforo fijo del dominio (≥80 / 50–79 / <50). */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        BAND_CLASSES[scoreBand(score)],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {Math.round(score)}
    </span>
  );
}
