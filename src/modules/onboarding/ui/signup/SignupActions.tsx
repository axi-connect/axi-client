"use client";

import type { ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * Pie de una pantalla del registro: el CTA a todo el ancho del control (blanco
 * sobre el campo, porque `--color-primary` se re-deriva dentro de
 * `.signup-field`), una línea de microcopy y, debajo, la vuelta atrás como
 * texto. Un solo pie para las cinco pantallas: si cambia el CTA, cambia aquí.
 */
export function SignupActions({
  label,
  submitting = false,
  submittingLabel,
  disabled = false,
  microcopy,
  back,
  type = "submit",
  onClick,
  describedBy,
  className,
}: {
  label: string;
  submitting?: boolean;
  submittingLabel?: string;
  disabled?: boolean;
  microcopy?: ReactNode;
  /** Normalmente un `DraftBackButton`; `null` en la primera pantalla. */
  back?: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  describedBy?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-[440px] flex-col items-center gap-2.5", className)}>
      <Button
        type={type}
        size="lg"
        onClick={onClick}
        disabled={disabled || submitting}
        aria-describedby={describedBy}
        className={cn(
          "h-14 w-full rounded-[14px] text-[15.5px] font-semibold transition-[transform,opacity,box-shadow]",
          "shadow-[0_18px_50px_rgb(0_0_0/.18)] hover:-translate-y-px active:scale-[.98] disabled:shadow-none",
        )}
      >
        {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        {submitting && submittingLabel ? submittingLabel : label}
        {!submitting ? <ArrowRight aria-hidden="true" /> : null}
      </Button>
      {microcopy ? <p className="text-muted-foreground text-xs leading-relaxed">{microcopy}</p> : null}
      {back ? <div className="mt-1 [&_button]:text-muted-foreground [&_button]:rounded-full [&_button:hover]:text-foreground">{back}</div> : null}
    </div>
  );
}
