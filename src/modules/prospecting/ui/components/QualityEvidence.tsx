"use client";

import { Check, Minus, TriangleAlert, X } from "lucide-react";

import { cn } from "@/core/lib/utils";

import type { QualityCheck } from "../../domain/lead";

const OUTCOME_STYLE: Record<
  QualityCheck["outcome"],
  { icon: typeof Check; iconClassName: string }
> = {
  pass: {
    icon: Check,
    iconClassName: "text-success",
  },
  warn: {
    icon: TriangleAlert,
    iconClassName: "text-warning",
  },
  fail: {
    icon: X,
    iconClassName: "text-destructive",
  },
  // Sin medir: neutro y apagado. NO es un fallo, y pintarlo en rojo haría que
  // un lead sin verificar pareciera un lead malo.
  unknown: {
    icon: Minus,
    iconClassName: "text-muted-foreground",
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
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {checks.map((check) => {
        const style = OUTCOME_STYLE[check.outcome];
        const Icon = style.icon;
        return (
          <li
            key={check.key}
            // Píldora neutra y el color SOLO en el icono: texto del color de su propio tinte no pasa AA en claro.
            className={cn(
              "bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px]",
              check.outcome === "unknown" && "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-3.5 shrink-0", style.iconClassName)} aria-hidden />
            {check.evidence}
          </li>
        );
      })}
    </ul>
  );
}
