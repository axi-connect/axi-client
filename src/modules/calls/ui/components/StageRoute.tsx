"use client";

import { Check, CircleDot, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { RouteStep } from "@/modules/calls/domain/live-call";

/**
 * La ruta del marco de una llamada proactiva (plan de modos §4): lo recorrido
 * con su check, la etapa actual en violeta (el color de la IA) y lo que falta
 * atenuado. En la terminada, `fell` marca dónde se cortó. Una lista ordenada:
 * el orden de las etapas ES información. En pantallas angostas desliza dentro
 * de su propio contenedor, nunca empuja la página (`.axi-scroll`).
 */
export function StageRoute({
  steps,
  fellAt = null,
  label = "Etapas de la llamada",
  className,
}: {
  steps: readonly RouteStep[];
  /** Clave de la etapa donde se cortó (terminada sin objetivo cumplido). */
  fellAt?: string | null;
  label?: string;
  className?: string;
}) {
  if (steps.length === 0) return null;
  return (
    <nav aria-label={label} className={cn("axi-scroll -mx-1 overflow-x-auto px-1 pb-1", className)}>
      <ol className="flex w-max items-center gap-1">
        {steps.map((step, index) => {
          const fell = fellAt !== null && step.key === fellAt;
          return (
            <li key={step.key} className="flex items-center gap-1">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn("h-px w-3 shrink-0", step.state === "next" && !fell ? "bg-border" : "bg-success/60")}
                />
              )}
              <span
                aria-current={step.state === "now" ? "step" : undefined}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs whitespace-nowrap",
                  fell
                    ? "bg-warning/15 font-medium text-foreground"
                    : step.state === "now"
                      ? "bg-accent-violet/15 font-medium text-foreground"
                      : step.state === "done"
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70",
                )}
              >
                {fell ? (
                  <TriangleAlert aria-hidden className="size-3.5 text-warning" />
                ) : step.state === "done" ? (
                  <Check aria-hidden className="size-3.5 text-success" />
                ) : step.state === "now" ? (
                  <CircleDot aria-hidden className="size-3.5 text-accent-violet" />
                ) : (
                  <span aria-hidden className="size-2 rounded-full border border-muted-foreground/50" />
                )}
                {step.label}
                <span className="sr-only">
                  {fell ? " (aquí se cortó)" : step.state === "done" ? " (recorrida)" : step.state === "now" ? " (actual)" : " (pendiente)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
