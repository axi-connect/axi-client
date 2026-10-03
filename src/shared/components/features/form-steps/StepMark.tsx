import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * - `pending`: falta. Su cara la elige `pendingStyle`.
 * - `current`: es el paso en curso (anillo de marca).
 * - `done`: hecho (✓, o el número relleno si `showCheck` es `false`).
 * - `error`: tiene algo que corregir (tinte destructivo, con el número).
 * - `blocked`: algo lo bloquea («!» con anillo de aviso).
 */
export type StepMarkState = "pending" | "current" | "done" | "error" | "blocked";

/** `sm` 24 px (dentro de un diálogo), `md` 28 px, `lg` 32 px. */
export type StepMarkSize = "sm" | "md" | "lg";

/**
 * Las tres caras de «falta» que conviven hoy (F2: se centralizan sin cambiar lo
 * que se ve): `fill` relleno tenue (catálogo, plantillas), `outline` borde fino
 * (editor del piloto) y `faint` anillo de 1 px con el número apagado (campañas).
 */
export type StepMarkPendingStyle = "fill" | "outline" | "faint";

const SIZE: Record<StepMarkSize, { box: string; check: string }> = {
  sm: { box: "size-6 text-xs", check: "size-3" },
  md: { box: "size-7 text-[13px]", check: "size-3.5" },
  lg: { box: "size-8 text-xs", check: "size-4" },
};

const PENDING: Record<StepMarkPendingStyle, string> = {
  fill: "bg-muted text-foreground",
  outline: "border-[1.5px] border-border",
  faint: "text-muted-foreground ring-1 ring-inset ring-border",
};

const STATE: Record<Exclude<StepMarkState, "pending">, string> = {
  current: "border-2 border-brand text-foreground",
  done: "bg-foreground text-background",
  error: "bg-destructive/15 text-foreground",
  blocked: "border-2 border-warning text-foreground",
};

/**
 * La marca circular de un paso (DESIGN-SYSTEM §9.7): el número, ✓ si está
 * hecho o «!» si algo lo bloquea. Es decorativa (`aria-hidden`): el estado lo
 * dice el texto del paso que la acompaña.
 */
export function StepMark({
  number,
  state,
  size = "lg",
  pendingStyle = "fill",
  showCheck = true,
  className,
  checkClassName,
  checkStrokeWidth = 2.5,
}: {
  number: number;
  state: StepMarkState;
  size?: StepMarkSize;
  pendingStyle?: StepMarkPendingStyle;
  /** `false`: un paso hecho conserva su número (relleno) en vez del ✓. */
  showCheck?: boolean;
  className?: string;
  /** Ajustes finos del ✓ de cada pantalla (tamaño). */
  checkClassName?: string;
  checkStrokeWidth?: number;
}) {
  const look = SIZE[size];
  return (
    <span
      aria-hidden="true"
      data-state={state}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums",
        look.box,
        state === "pending" ? PENDING[pendingStyle] : STATE[state],
        className,
      )}
    >
      {state === "done" && showCheck ? (
        <Check className={cn(look.check, checkClassName)} strokeWidth={checkStrokeWidth} />
      ) : state === "blocked" ? (
        "!"
      ) : (
        number
      )}
    </span>
  );
}
