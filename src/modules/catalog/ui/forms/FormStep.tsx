"use client";

import { useId } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/core/lib/utils";

/**
 * Un paso plegable de un formulario largo (DESIGN-SYSTEM §9.7, catálogo
 * premium F3, canvas tablero 6): número o ✓, título, y debajo el subtítulo
 * abierto o el resumen de lo elegido plegado. El contenido NO se desmonta al
 * plegar (`hidden`): los campos conservan su valor y siguen validándose.
 */
export function FormStep({
  number,
  title,
  subtitle,
  summary,
  done,
  open,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  /** Lo elegido en una línea, para cuando el paso está plegado. */
  summary?: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const bodyId = useId();
  const line = open ? subtitle : (summary ?? subtitle);
  return (
    <section aria-label={title} className="min-w-0 rounded-3xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3.5 rounded-3xl px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
            done ? "bg-foreground text-background" : "bg-muted text-foreground",
          )}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{title}</span>
          {line ? (
            <span className="truncate text-xs text-muted-foreground" title={line}>
              {line}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div id={bodyId} hidden={!open} className="space-y-4 px-5 pb-5 sm:pl-[4.25rem]">
        {children}
      </div>
    </section>
  );
}
