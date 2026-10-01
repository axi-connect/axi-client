"use client";

import { Check, ChevronDown, PencilLine } from "lucide-react";

import { cn } from "@/core/lib/utils";

export type StepCardState = "done" | "blocked" | "pending";

/**
 * Las dos caras de la tarjeta. `edit` es la de Preparar entrega: cerrada dice
 * «Editar» y abierta «Listo», y un paso pendiente lleva el anillo de marca.
 * `chevron` es la del editor del piloto, como en su mockup: un chevrón que gira,
 * con el número más chico y el título más grande.
 */
const LOOK = {
  edit: {
    button: "flex w-full items-center gap-3 rounded-3xl px-4 py-4 sm:gap-4 sm:px-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    badge: "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
    pending: "border-2 border-brand text-foreground",
    check: "size-4",
    title: "block text-sm font-semibold",
    summary: "mt-0.5 block text-[13px] text-pretty text-muted-foreground sm:text-sm",
    panel: "space-y-5 px-5 pb-5 sm:pl-[4.25rem] lg:pl-5 [&_input]:min-w-0",
  },
  chevron: {
    button: "focus-visible:outline-ring flex w-full items-center gap-3.5 rounded-3xl px-5 py-[18px] text-left focus-visible:outline-2 focus-visible:outline-offset-2",
    badge: "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
    pending: "border-border border-[1.5px]",
    check: "size-3.5",
    title: "block text-[15.5px] font-semibold",
    summary: "text-muted-foreground mt-0.5 block text-[13px] text-pretty",
    panel: "flex flex-col gap-[18px] px-5 pb-5 sm:pl-[62px]",
  },
} as const;

/**
 * Un paso plegable (DESIGN-SYSTEM §9.7): cerrado muestra su resumen; abierto,
 * sus campos. Toda la cabecera es el botón (`aria-expanded`), con el número, ✓
 * si está hecho o «!» si algo lo bloquea (y el lector de pantalla lo oye con
 * `blockedHint`).
 */
export function StepCard({
  id,
  index,
  title,
  summary,
  state,
  open,
  onToggle,
  variant = "edit",
  blockedHint = "por resolver",
  children,
}: {
  /** El prefijo del id del panel (`aria-controls`): único en la página. */
  id: string;
  index: number;
  title: string;
  summary: React.ReactNode;
  state: StepCardState;
  open: boolean;
  onToggle: () => void;
  variant?: keyof typeof LOOK;
  blockedHint?: string;
  children?: React.ReactNode;
}) {
  const look = LOOK[variant];
  const panelId = `${id}-${String(index)}`;
  return (
    <section
      className={cn(
        "rounded-3xl border bg-card transition-shadow",
        variant === "chevron" && "overflow-hidden",
        open ? "border-foreground/15 shadow-[var(--shadow-float)]" : "border-border",
      )}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={look.button}>
        <span
          aria-hidden="true"
          className={cn(
            look.badge,
            state === "done" && !open && "bg-foreground text-background",
            state === "blocked" && "border-2 border-warning text-foreground",
            (state === "pending" || (state === "done" && open)) && look.pending,
          )}
        >
          {state === "done" && !open ? <Check className={look.check} strokeWidth={2.5} /> : state === "blocked" ? "!" : index}
        </span>
        <span className="min-w-0 flex-1">
          <span className={look.title}>
            {title}
            {state === "blocked" ? <span className="sr-only"> ({blockedHint})</span> : null}
          </span>
          {open ? null : <span className={look.summary}>{summary}</span>}
        </span>
        {variant === "edit" ? (
          // En el celular, «Editar» es un icono: el resumen necesita ese ancho.
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg py-1 text-sm font-medium sm:px-2">
            {open ? <Check aria-hidden="true" className="size-4 sm:hidden" /> : <PencilLine aria-hidden="true" className="size-4 sm:hidden" />}
            <span className="sr-only sm:not-sr-only">{open ? "Listo" : "Editar"}</span>
          </span>
        ) : (
          <ChevronDown aria-hidden="true" className={cn("size-[18px] shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        )}
      </button>
      {open ? (
        <div id={panelId} className={look.panel}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
