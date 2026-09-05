import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Una pantalla del registro (mockup v3 «Flow»): la pregunta grande, una línea
 * de contexto y, debajo, el único control que hace falta responder. Sin card:
 * el campo de marca es el escenario y la tipografía hace la jerarquía.
 *
 * `h1` por pantalla a propósito: cada pantalla ES una pregunta, y el lector
 * de pantalla la anuncia al llegar (`aria-live` en el contenedor del funnel).
 */
export function SignupScreen({
  title,
  lead,
  children,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[760px] flex-col items-center text-center", className)}>
      <h1 className="font-heading max-w-[14ch] text-[clamp(32px,4.6vw,54px)] leading-[1.05] font-bold tracking-[-.02em] text-balance">
        {title}
      </h1>
      {lead ? <p className="text-muted-foreground mt-3.5 max-w-[46ch] text-[15px] leading-relaxed">{lead}</p> : null}
      <div className="mt-6 flex w-full flex-col items-center gap-2.5">{children}</div>
    </div>
  );
}

/** Puntos de progreso (uno por pantalla): el activo crece, los pasados quedan llenos. */
export function SignupProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-[7px]" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <i
          key={index}
          className={cn(
            "block size-1.5 rounded-full transition-[background-color,transform] duration-300",
            index === current ? "bg-foreground scale-125" : index < current ? "bg-foreground/70" : "bg-foreground/35",
          )}
        />
      ))}
    </div>
  );
}
