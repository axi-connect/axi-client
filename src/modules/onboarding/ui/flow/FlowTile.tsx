"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * Ficha «Flow» (mockup v3): cristal sobre el campo, superficie elevada sobre el
 * suelo; texto a la izquierda y el gráfico de capacidad en su **columna
 * propia** a la derecha (el dueño rechazó la versión en que se solapaba con el
 * texto). Es la misma pieza para paquetes, módulos, nichos y plantillas: el
 * material lo pone el alcance (`--sf-*`), el contenido lo ponen las props.
 *
 * «Seleccionado = elevado, nunca teñido» sigue valiendo aquí, traducido al
 * material: el cristal sube al 30 % (o se vuelve sólido sobre el suelo), el
 * borde se enciende y aparece la marca. La marca es redonda en un `radio`
 * (una sola opción) y cuadrada en un `checkbox` (varias), para que se lea
 * cuántas se pueden elegir.
 */
export function FlowTile({
  role,
  checked,
  onClick,
  title,
  badge,
  meta,
  metaNote,
  description,
  graphic,
  featured = false,
  testId,
}: {
  role: "radio" | "checkbox";
  checked: boolean;
  onClick: () => void;
  title: string;
  badge?: string;
  /** La cifra o el dato fuerte de la ficha (precio, rol…); línea propia en tipografía de título. */
  meta?: ReactNode;
  /** Nota bajo la cifra (precio de lista tachado…); línea propia para no empujar el gráfico. */
  metaNote?: ReactNode;
  description: ReactNode;
  graphic: ReactNode;
  /** Ocupa las dos columnas y da más ancho al gráfico. */
  featured?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "sf-glass relative grid min-h-[100px] w-full items-center gap-x-4 rounded-[14px] py-3.5 pr-4 pl-[18px] text-left",
        "grid-cols-[minmax(0,1fr)_112px] sm:grid-cols-[minmax(0,1fr)_128px]",
        "transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
        "hover:bg-[var(--sf-glass-hover)] hover:-translate-y-px",
        "focus-visible:border-[color:var(--sf-fg)] focus-visible:outline-none",
        checked && "sf-glass-on -translate-y-px shadow-[0_12px_36px_rgb(0_0_0/.14)]",
        featured && "sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_190px]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-2.5 right-2.5 grid size-[22px] place-items-center transition-[transform,background-color,border-color,color] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
          role === "radio"
            ? cn("bg-foreground text-primary-foreground rounded-full", checked ? "scale-100" : "scale-0")
            : cn("rounded-[6px] border-[1.5px]", checked ? "bg-foreground border-foreground text-primary-foreground" : "sf-line text-transparent"),
        )}
      >
        <Check className="size-3.5" strokeWidth={2.6} />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5 overflow-hidden pr-1">
        <span className="flex items-center gap-2 text-[15.5px] font-semibold">
          {title}
          {badge ? (
            <span className="bg-foreground text-primary-foreground inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-semibold tracking-[.04em] uppercase">
              {badge}
            </span>
          ) : null}
        </span>
        {meta ? <span className="font-heading text-[17px] leading-tight font-bold tracking-[-.01em] whitespace-nowrap tabular-nums">{meta}</span> : null}
        {metaNote ? <span className="text-muted-foreground text-xs leading-tight tabular-nums">{metaNote}</span> : null}
        <span className="text-muted-foreground text-[12.5px] leading-[1.35]">{description}</span>
      </span>

      <span className={cn("text-foreground grid w-[112px] self-center pt-5 opacity-85 sm:w-[128px]", featured && "sm:w-[190px]")}>{graphic}</span>
    </button>
  );
}
