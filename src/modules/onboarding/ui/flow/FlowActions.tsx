"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * Pie de una pantalla «Flow»: el CTA a todo el ancho del control (blanco
 * sobre el campo porque `--color-primary` se re-deriva dentro de
 * `.signup-field`; coral sobre el suelo, donde no se re-deriva), una acción
 * secundaria opcional (la salida «saltar / mantener» del onboarding), el error
 * de guardado, una línea de microcopy y, debajo, la vuelta atrás como texto.
 * Un solo pie para todas las pantallas: si cambia el CTA, cambia aquí.
 */
export function FlowActions({
  label,
  microcopyId,
  submitting = false,
  submittingLabel,
  disabled = false,
  secondary,
  error,
  microcopy,
  back,
  type = "submit",
  onClick,
  describedBy,
  className,
}: {
  /** Texto del CTA. Sin él no hay botón principal: la acción vive en el control (p. ej. el editor de horarios guarda solo). */
  label?: string;
  /** `id` de la línea de microcopy, para enlazarla como `aria-describedby` del CTA cuando es el motivo de un bloqueo. */
  microcopyId?: string;
  submitting?: boolean;
  submittingLabel?: string;
  disabled?: boolean;
  /** Acción alternativa bajo el CTA (ghost): «Mantener este horario», «Conectar después»… */
  secondary?: ReactNode;
  /** Error de la acción, anunciado como alerta bajo el CTA. */
  error?: string | null;
  microcopy?: ReactNode;
  /** Normalmente un `DraftBackButton` o `FlowBackButton`; `null` en la primera pantalla. */
  back?: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  describedBy?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-[440px] flex-col items-center gap-2.5", className)}>
      {label ? (
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
      ) : null}
      {secondary ? <div className="flex w-full flex-col items-stretch [&_button]:h-12 [&_button]:w-full [&_button]:rounded-[14px]">{secondary}</div> : null}
      {error ? (
        <p role="alert" className="text-destructive text-[13px] leading-relaxed font-medium">
          {error}
        </p>
      ) : null}
      {microcopy ? (
        <p id={microcopyId} className="text-muted-foreground text-xs leading-relaxed">
          {microcopy}
        </p>
      ) : null}
      {back ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1 [&_a]:text-muted-foreground [&_a]:text-sm [&_a]:font-medium [&_a:hover]:text-foreground [&_button]:text-muted-foreground [&_button]:rounded-full [&_button:hover]:text-foreground">
          {back}
        </div>
      ) : null}
    </div>
  );
}

/** Vuelta atrás fuera de un formulario (el registro usa `DraftBackButton`, que además guarda el borrador). */
export function FlowBackButton({ onClick, label = "Atrás" }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick}>
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
