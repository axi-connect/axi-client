"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/core/lib/utils";
import { scoreBand, type ScoreBand } from "@/modules/analytics/domain/labels";

const BAND_STROKE: Record<ScoreBand, string> = {
  good: "stroke-success",
  warning: "stroke-warning",
  critical: "stroke-destructive",
};

const BAND_TEXT: Record<ScoreBand, string> = {
  good: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

/**
 * Anillo de score (0–100) en SVG con semáforo fijo (labels.ts#scoreBand):
 * stroke-dashoffset animado por transición CSS 0.6s (compositor-friendly);
 * con reduced-motion pinta directo el valor final.
 */
export function ScoreRing({
  score,
  size = 112,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const band = scoreBand(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));

  // Primer render con el anillo vacío → transición CSS hasta el valor.
  const [progress, setProgress] = useState(reduced ? clamped : 0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const offset = circumference * (1 - progress / 100);

  return (
    <div
      role="img"
      aria-label={`Puntaje de calidad: ${Math.round(score)} de 100`}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            BAND_STROKE[band],
            !reduced && "transition-[stroke-dashoffset] duration-[600ms] ease-out",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums", BAND_TEXT[band])}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </span>
    </div>
  );
}
