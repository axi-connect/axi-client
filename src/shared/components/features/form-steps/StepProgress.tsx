"use client";

import { cn } from "@/core/lib/utils";

/**
 * `ready` listo; `warning` pasa, pero con un aviso; `blocked` hay algo que
 * corregir y NO pasa (se pinta como el aviso pero no cuenta); `pending` por
 * resolver, sin empezar.
 */
export type StepProgressState = "ready" | "warning" | "blocked" | "pending";

export interface StepProgressCheck {
  id: string;
  /** El nombre del tramo (va en `title` y, con su estado, en `sr-only`). */
  label: string;
  state: StepProgressState;
  /** Lleva al paso donde se resuelve. */
  onGo: () => void;
}

const BAR: Record<StepProgressState, string> = {
  ready: "bg-current",
  warning: "bg-warning",
  blocked: "bg-warning",
  pending: "bg-current/20",
};

const SPOKEN: Record<StepProgressState, string> = {
  ready: ": listo",
  warning: ": con un aviso",
  blocked: ": por corregir",
  pending: ": por resolver",
};

/** Cuántos tramos pasan: los listos y los que solo traen un aviso; lo que hay que corregir, no. */
export function countPassing(checks: readonly StepProgressCheck[]): number {
  return checks.filter((check) => check.state === "ready" || check.state === "warning").length;
}

/**
 * Solo los tramos: un botón por tramo de 24 px de alto con la barra de 6 px
 * dentro, que lleva a su paso, con su estado en `sr-only`. Para una isla que
 * pone el estado y qué falta en otro sitio (la página de plantillas de Meta,
 * donde van en la misma fila); `StepProgress` los apila con su título.
 */
export function StepTramos({
  checks,
  label = "Qué falta",
  className,
}: {
  checks: readonly StepProgressCheck[];
  /** El nombre accesible de la lista de tramos. */
  label?: string;
  className?: string;
}) {
  return (
    <ul className={cn("flex gap-1", className)} aria-label={label}>
      {checks.map((check) => (
        <li key={check.id} className="flex-1">
          <button
            type="button"
            onClick={check.onGo}
            title={check.label}
            className="flex h-6 w-full items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <span aria-hidden="true" className={cn("block h-1.5 w-full rounded-full", BAR[check.state])} />
            <span className="sr-only">
              {check.label}
              {SPOKEN[check.state]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * El progreso por tramos de una barra de acción (DESIGN-SYSTEM §9.7): el estado
 * en una palabra con el contador de tramos que ya pasan (listos o con aviso),
 * los tramos (`StepTramos`), y debajo qué falta nombrado.
 *
 * Presentacional puro: qué es cada tramo, su estado y el texto de qué falta los
 * decide quien la usa. Los tramos se pintan con `currentColor`: hereda el color
 * de la superficie (pensada para la isla de tinta).
 */
export function StepProgress({
  title,
  checks,
  detail,
  label = "Qué falta",
  className,
}: {
  title: React.ReactNode;
  checks: readonly StepProgressCheck[];
  detail: React.ReactNode;
  /** El nombre accesible de la lista de tramos. */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold whitespace-nowrap">{title}</span>
        <span className="text-xs tabular-nums opacity-70">
          {countPassing(checks)}/{checks.length}
        </span>
      </div>
      <StepTramos checks={checks} label={label} className="-my-2" />
      <p className="truncate text-xs opacity-70">{detail}</p>
    </div>
  );
}
