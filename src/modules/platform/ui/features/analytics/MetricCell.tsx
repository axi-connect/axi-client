/**
 * Valor de métrica con semáforo (triage y dashboard): punto de color + valor
 * tabular. El tono viene de `domain/thresholds.ts` (fuente única §4); esta
 * celda solo lo pinta — escala semántica, nunca colores de marca.
 */
import { cn } from "@/core/lib/utils";
import type { MetricTone } from "../../../domain/thresholds";

const TONE_TEXT: Record<MetricTone, string> = {
  success: "text-foreground",
  warning: "text-warning font-medium",
  destructive: "text-destructive font-medium",
  neutral: "text-muted-foreground",
};

const TONE_DOT: Record<MetricTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-border",
};

export function MetricCell({ tone, children, className, appearance = "tint" }: {
  tone: MetricTone;
  children: React.ReactNode;
  className?: string;
  /** `dot`: el tono solo en el punto y el texto en foreground (AA). Quality lo usa siempre. */
  appearance?: "tint" | "dot";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 tabular-nums",
        appearance === "dot" ? (tone === "neutral" ? "text-muted-foreground" : "text-foreground") : TONE_TEXT[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}
