"use client";

import { Check, Minus, TriangleAlert, X } from "lucide-react";

import { cn } from "@/core/lib/utils";

import type { QualityCheck } from "../../domain/lead";

const OUTCOME_STYLE: Record<
  QualityCheck["outcome"],
  { icon: typeof Check; className: string }
> = {
  pass: {
    icon: Check,
    className: "text-success border-success/35 bg-success/10",
  },
  warn: {
    icon: TriangleAlert,
    className: "text-warning border-warning/35 bg-warning/10",
  },
  fail: {
    icon: X,
    className: "text-destructive border-destructive/35 bg-destructive/10",
  },
  // Sin medir: neutro y apagado. NO es un fallo, y pintarlo en rojo haría que
  // un lead sin verificar pareciera un lead malo.
  unknown: {
    icon: Minus,
    className: "text-muted-foreground border-border bg-transparent",
  },
};

/**
 * La evidencia de una señal del índice.
 *
 * Existe porque un puntaje que no se puede discutir no es accionable: «74» no
 * dice nada, «el dominio acepta cualquier dirección, nadie puede confirmar este
 * buzón» dice qué hacer.
 *
 * Las señales sin medir se muestran igual, en gris. Son la respuesta a «¿por
 * qué 74 y no 90?» cuando el motivo no es que algo falle sino que nadie lo ha
 * mirado todavía — y ocultarlas haría que el número pareciera arbitrario.
 */
export function QualityEvidence({ checks }: { checks: QualityCheck[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {checks.map((check) => {
        const style = OUTCOME_STYLE[check.outcome];
        const Icon = style.icon;
        return (
          <li
            key={check.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              style.className,
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            {check.evidence}
          </li>
        );
      })}
    </ul>
  );
}
