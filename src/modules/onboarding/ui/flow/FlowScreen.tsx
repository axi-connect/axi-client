"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/core/lib/utils";

const SIZE_CLASS = {
  /** Una pregunta y un control: formularios, cierre. */
  narrow: "max-w-[760px]",
  /** Rejillas de fichas y pantallas a dos columnas. */
  wide: "max-w-[960px]",
  /** Datos densos en superficie sólida (la tabla de revisión del catálogo). */
  full: "max-w-[1120px]",
} as const;

/**
 * Una pantalla «Flow» (mockup v3): la pregunta grande, una línea de contexto
 * y, debajo, el único control que hace falta responder. Sin card: el escenario
 * (campo o suelo) es el fondo y la tipografía hace la jerarquía.
 *
 * `h1` por pantalla a propósito: cada pantalla ES una pregunta, y el lector de
 * pantalla la anuncia al llegar (`aria-live` en el contenedor del funnel). Con
 * `focusHeading` el título recibe el foco al montar: es lo que hacen las
 * pantallas sin un primer input al que saltar (elegir una ficha, revisar).
 */
export function FlowScreen({
  title,
  lead,
  size = "narrow",
  focusHeading = false,
  children,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  focusHeading?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true });
  }, [focusHeading]);

  return (
    <div className={cn("mx-auto flex w-full flex-col items-center text-center", SIZE_CLASS[size], className)}>
      <h1
        ref={headingRef}
        tabIndex={focusHeading ? -1 : undefined}
        className="font-heading max-w-[14ch] text-[clamp(32px,4.6vw,54px)] leading-[1.05] font-bold tracking-[-.02em] text-balance outline-none"
      >
        {title}
      </h1>
      {lead ? <p className="text-muted-foreground mt-3.5 max-w-[46ch] text-[15px] leading-relaxed">{lead}</p> : null}
      <div className="mt-6 flex w-full flex-col items-center gap-2.5">{children}</div>
    </div>
  );
}

/** Puntos de progreso (uno por pantalla): el activo crece, los pasados quedan llenos. */
export function FlowProgressDots({ total, current }: { total: number; current: number }) {
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
