"use client";

import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/core/styles/motion";
import { SUBSCORE_LABELS } from "@/modules/analytics/domain/labels";
import type { EvaluationDTO } from "@/modules/analytics/domain/analytics";

/**
 * Sub-puntajes de una evaluación como barras 1–5 etiquetadas (NO radar:
 * cuatro escalas discretas leen mejor como barras). Animación en cascada.
 */
export function SubScoreBars({ scores }: { scores: EvaluationDTO["scores"] }) {
  const reduced = useReducedMotion() ?? false;
  const entries = (Object.keys(SUBSCORE_LABELS) as (keyof typeof scores)[])
    .map((key) => ({ key, label: SUBSCORE_LABELS[key], value: scores[key] }))
    .filter((entry) => entry.value !== null);

  if (entries.length === 0) return null;

  return (
    <dl className="space-y-2">
      {entries.map((entry, index) => (
        <div key={entry.key} className="flex items-center gap-3">
          <dt className="w-28 shrink-0 text-sm text-muted-foreground">{entry.label}</dt>
          <dd className="flex flex-1 items-center gap-2">
            <div
              role="img"
              aria-label={`${entry.label}: ${entry.value} de 5`}
              className="flex h-2 flex-1 gap-1"
            >
              {[1, 2, 3, 4, 5].map((step) => (
                <motion.span
                  key={step}
                  className={
                    step <= (entry.value ?? 0)
                      ? "h-full flex-1 rounded-full bg-primary"
                      : "h-full flex-1 rounded-full bg-secondary"
                  }
                  initial={reduced ? false : { opacity: 0, scaleX: 0.6 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { ...spring.snappy, delay: index * 0.06 + step * 0.02 }
                  }
                />
              ))}
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
              {entry.value}/5
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
