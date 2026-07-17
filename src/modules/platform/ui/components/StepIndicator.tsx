"use client";

/**
 * Indicador de pasos/fases del panel — lo usan el wizard de alta (pasos
 * clickeables hacia atrás) y las máquinas de estado de FE4 (DB dedicada,
 * migración de datos; solo lectura). Gramática de marca: coral = actual,
 * violeta suave = completado, neutro = pendiente.
 */
import { Check } from "lucide-react";
import { cn } from "@/core/lib/utils";

type StepIndicatorProps = {
  steps: readonly string[];
  current: number;
  /** Permite volver a un paso ya completado (nunca saltar hacia adelante). */
  onStepClick?: (index: number) => void;
  /** Etiqueta accesible del grupo. Default: "Progreso". */
  ariaLabel?: string;
};

export function StepIndicator({ steps, current, onStepClick, ariaLabel = "Progreso" }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2" aria-label={ariaLabel}>
      {steps.map((label, index) => {
        const isActive = index === current;
        const isDone = index < current;
        return (
          <li key={label} className={cn("flex items-center gap-2", index > 0 && "flex-1")}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn("h-px flex-1 rounded-full", isDone || isActive ? "bg-accent-violet/50" : "bg-border")}
              />
            )}
            <button
              type="button"
              disabled={!isDone || !onStepClick}
              onClick={() => onStepClick?.(index)}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors",
                isDone && onStepClick && "hover:bg-accent",
                !isDone && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-accent-violet/15 text-accent-violet",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden sm:inline",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
