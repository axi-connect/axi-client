"use client";

import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/core/lib/utils";
import type { StageStep, StageStepState } from "@/modules/calls/domain/live-call";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";

/** Más pendientes que esto se agrupan en una línea desplegable. */
const FOLD_AFTER = 2;

const NODE: Record<StageStepState, string> = {
  done: "bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/35",
  // Sólidos como en el tablero aprobado: el icono va en `--axi-on-color`, el
  // color pensado para ir sobre relleno (blanco en claro, tinta en oscuro).
  reached: "bg-accent-violet text-[var(--axi-on-color)]",
  met: "bg-success text-success-foreground",
  fell: "bg-warning text-warning-foreground",
  pending: "border-[1.5px] border-dashed border-muted-foreground/60",
  skipped: "border-[1.5px] border-dashed border-muted-foreground/60",
};

const SR: Record<StageStepState, string> = {
  done: " (recorrida)",
  reached: " (hasta aquí llegó)",
  met: " (objetivo cumplido)",
  fell: " (aquí se cortó)",
  pending: " (sin recorrer)",
  skipped: " (no hizo falta)",
};

function note(step: StageStep): { text: string; className: string } | null {
  // F2-1: el verde a 12 px no pasa AA en claro (3,1:1); el verde va en el nodo.
  if (step.state === "met") return { text: "Aquí se cumplió el objetivo", className: "font-medium text-foreground" };
  if (step.state === "fell" && step.goal !== null && step.goal.trim() !== "") {
    const goal = step.goal.trim();
    return { text: `Buscaba: ${goal.charAt(0).toLowerCase()}${goal.slice(1)}`, className: "text-muted-foreground" };
  }
  return null;
}

/**
 * La ruta vertical de una llamada terminada (rediseño de la ruta, 2026-09-30,
 * mockup aprobado): una fila por etapa con su nombre completo, el minuto en que
 * entró y, donde se cortó o se cumplió, una nota. Lo que quedó sin recorrer se
 * agrupa en una línea desplegable si es más de dos. No usa el `Timeline` del
 * DS porque necesita la hora a la derecha, la conectora teñida por lo recorrido
 * y el pliegue; el lenguaje (nodo + conectora) es el mismo.
 */
export function StageTimeline({
  steps,
  label,
  className,
}: {
  steps: readonly StageStep[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const foldId = useId();
  const tail = steps.filter((step) => step.state === "pending" || step.state === "skipped");
  const folds = tail.length > FOLD_AFTER;
  const visible = folds && !open ? steps.slice(0, steps.length - tail.length) : steps;
  if (steps.length === 0) return null;
  const skipped = tail.length > 0 && tail.every((step) => step.state === "skipped");
  const foldText = open
    ? skipped
      ? "Ocultar las que no hicieron falta"
      : "Ocultar las etapas sin recorrer"
    : skipped
      ? `${String(tail.length)} etapas no hicieron falta`
      : `${String(tail.length)} etapas sin recorrer · ${tail.map((step) => step.label).join(", ")}`;

  return (
    <div className={cn("flex flex-col", className)}>
      <ol id={foldId} aria-label={label} className="flex flex-col">
        {visible.map((step, index) => {
          const isLast = index === visible.length - 1;
          const walked = step.state === "done";
          const stepNote = note(step);
          return (
            <li key={step.key} className="grid grid-cols-[1.375rem_minmax(0,1fr)_auto] gap-x-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn("flex size-[1.375rem] shrink-0 items-center justify-center rounded-full", NODE[step.state])}
                >
                  {step.state === "fell" ? (
                    <TriangleAlert className="size-3" />
                  ) : step.state === "done" || step.state === "met" ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : step.state === "reached" ? (
                    <span className="size-2 rounded-full bg-current" />
                  ) : null}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn("my-1 min-h-2.5 w-px grow rounded-full", walked ? "bg-accent-violet/45" : "bg-border")}
                  />
                ) : folds && !open ? (
                  <span aria-hidden className="my-1 min-h-2.5 grow border-l-[1.5px] border-dashed border-border" />
                ) : null}
              </div>
              <div className={cn("min-w-0", isLast && !(folds && !open) ? "pb-0.5" : "pb-3.5")}>
                <p
                  className={cn(
                    "text-sm leading-5",
                    step.state === "pending" || step.state === "skipped"
                      ? "text-muted-foreground"
                      : step.state === "done"
                        ? "font-medium"
                        : "font-semibold",
                  )}
                >
                  {step.label}
                  <span className="sr-only">{SR[step.state]}</span>
                </p>
                {stepNote !== null && (
                  <p className={cn("mt-0.5 text-xs leading-snug", stepNote.className)}>{stepNote.text}</p>
                )}
              </div>
              <span className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {step.entered_s === null ? "" : formatCallClock(step.entered_s)}
              </span>
            </li>
          );
        })}
      </ol>
      {folds && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={foldId}
          onClick={() => setOpen((value) => !value)}
          className="-mt-1 flex min-h-11 items-center gap-3 rounded-md text-left text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="flex w-[1.375rem] shrink-0 justify-center">
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </span>
          <span className="min-w-0">{foldText}</span>
        </button>
      )}
    </div>
  );
}
