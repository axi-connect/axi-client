import { cn } from "@/core/lib/utils";
import type { StageStep, StageStepState } from "@/modules/calls/domain/live-call";

const SEGMENT: Record<StageStepState, string> = {
  done: "bg-accent-violet",
  reached: "bg-accent-violet ring-3 ring-accent-violet/20",
  met: "bg-success",
  fell: "bg-warning",
  pending: "bg-foreground/10",
  skipped: "bg-foreground/10",
};

/**
 * El medidor de etapas (rediseño de la ruta, 2026-09-30): un segmento por
 * etapa del marco, rellenos hasta donde llegó la llamada. Ocupa el ancho de su
 * contenedor — nunca scrollea ni corta etiquetas: los nombres van en el texto
 * de al lado o en la ruta vertical. Para el lector de pantalla es una imagen
 * con su posición («Propuesta · 2 de 3»).
 */
export function StageMeter({
  steps,
  label,
  className,
}: {
  steps: readonly StageStep[];
  label: string;
  className?: string;
}) {
  if (steps.length === 0) return null;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${String(steps.length)}, minmax(0, 1fr))` }}
    >
      {steps.map((step) => (
        <span key={step.key} aria-hidden className={cn("h-1.5 rounded-full", SEGMENT[step.state])} />
      ))}
    </div>
  );
}
