"use client";

import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * El botón que abre la hoja, con el contador de lo que está puesto.
 *
 * El contador es la razón de que este botón sea un componente y no un `Button`
 * suelto en cada vista: es lo único que hace visible que hay filtros activos
 * cuando los chips no caben en la barra. Sale de `countActive`, así que ninguna
 * pantalla lo calcula a mano.
 *
 * Con filtros puestos el botón se ELEVA (fondo, borde firme, `shadow-float`) en
 * vez de teñirse: el mismo lenguaje que las pastillas de dentro, y el coral
 * queda reservado a la píldora del número.
 */
export function FilterTrigger({
  count,
  onClick,
  label = "Filtros",
  disabled,
  compact = false,
  className,
}: {
  count: number;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  /**
   * Solo icono + número (el texto pasa a `sr-only`). Para barras estrechas como
   * el rail del inbox (288 px), donde la etiqueta no cabe junto a la búsqueda.
   * El nombre accesible es idéntico al del botón completo.
   */
  compact?: boolean;
  className?: string;
}) {
  const active = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // El nombre accesible dice el número: «Filtros» a secas no distingue una
      // bandeja limpia de una con tres filtros puestos.
      aria-label={active ? `${label} (${count} activos)` : label}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border text-sm font-medium",
        compact ? "relative w-9 justify-center px-0" : "px-3",
        "outline-none transition-[background-color,border-color,box-shadow,color] duration-200",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-border bg-background text-foreground shadow-float"
          : "border-border-soft bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      {active ? (
        <span
          className={cn(
            "rounded-full text-[0.6875rem] tabular-nums",
            compact
              ? "bg-brand text-white dark:text-background absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center px-1 font-semibold"
              : "bg-accent text-accent-foreground px-1.5 py-px",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
