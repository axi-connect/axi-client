"use client";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * Un paso plegable del editor de rutas (DESIGN-SYSTEM §9.7, la `StepCard` de
 * Preparar entrega): la cabecera es un solo botón con el número o ✓ (o «!» si
 * tiene un error), el título y, cerrado, el resumen de lo elegido. La de
 * `platform` es privada de su vista; esta sigue el mismo contrato.
 */
export function StepCard({
  index,
  title,
  summary,
  state,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  summary: React.ReactNode;
  state: "done" | "error" | "pending";
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `route-step-${String(index)}`;
  return (
    <section
      className={cn(
        "bg-card overflow-hidden rounded-3xl border transition-shadow",
        open ? "border-foreground/15 shadow-[var(--shadow-float)]" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-visible:outline-ring flex w-full items-center gap-3.5 rounded-3xl px-5 py-[18px] text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
            state === "done" && !open && "bg-foreground text-background",
            state === "error" && "border-warning text-foreground border-2",
            (state === "pending" || (state === "done" && open)) && "border-border border-[1.5px]",
          )}
        >
          {state === "done" && !open ? <Check className="size-3.5" strokeWidth={2.5} /> : state === "error" ? "!" : String(index)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold">
            {title}
            {state === "error" && <span className="sr-only"> (tiene algo por corregir)</span>}
          </span>
          {!open && <span className="text-muted-foreground mt-0.5 block text-[13px] text-pretty">{summary}</span>}
        </span>
        <ChevronDown aria-hidden className={cn("size-[18px] shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-[18px] px-5 pb-5 sm:pl-[62px]">
          {children}
        </div>
      )}
    </section>
  );
}
