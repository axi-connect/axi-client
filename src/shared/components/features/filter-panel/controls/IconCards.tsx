"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { FilterOption } from "../filter-schema";

/**
 * Tarjetas con icono: la variante `layout: "cards"` de un filtro.
 *
 * Existe para los filtros de pocas opciones que necesitan explicarse —donde la
 * pastilla solo cabe la etiqueta y el `hint` se pierde en un `title` que nadie
 * abre—. Mismo tratamiento de selección que `PillGroup` (elevación, coral solo
 * en la marca) y misma regla de semántica por modo: `single` es un
 * `radiogroup` con tabindex móvil, `multi` son botones `aria-pressed`.
 *
 * El icono NO se pinta en coral al seleccionar: el color de acción marca UNA
 * cosa por tarjeta, y esa cosa es la marca de verificación. Dos acentos en la
 * misma tarjeta y ya no se sabe cuál dice «elegido».
 */

const CARD_BASE = [
  "relative flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left",
  "outline-none transition-[background-color,border-color,box-shadow] duration-200",
  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

const CARD_IDLE = "border-border-soft bg-secondary/30 hover:bg-secondary/60";
const CARD_ON = "border-border bg-background shadow-float";

function CardBody({ option, selected }: { option: FilterOption; selected: boolean }) {
  const Icon = option.icon;
  return (
    <React.Fragment>
      <span className="flex w-full items-center gap-2">
        {Icon ? <Icon aria-hidden="true" className="text-foreground size-4 shrink-0" /> : null}
        {option.dotClassName ? (
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dotClassName)} />
        ) : null}
        <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
          {option.label}
        </span>
        {selected ? <Check aria-hidden="true" className="text-brand size-3.5 shrink-0" /> : null}
      </span>
      {option.hint ? (
        <span className="text-muted-foreground text-xs leading-snug">{option.hint}</span>
      ) : null}
    </React.Fragment>
  );
}

type IconCardsProps = {
  /** Nombre del grupo para el lector de pantalla. Obligatorio. */
  label: string;
  options: readonly FilterOption[];
  disabled?: boolean;
  className?: string;
} & (
  | { mode: "multi"; value: readonly string[]; onChange: (next: string[]) => void }
  | { mode: "single"; value: string | undefined; onChange: (next: string | undefined) => void }
);

const GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";

export function IconCards(props: IconCardsProps) {
  return props.mode === "multi" ? <MultiCards {...props} /> : <SingleCards {...props} />;
}

function MultiCards({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: Extract<IconCardsProps, { mode: "multi" }>) {
  const selected = new Set(value);

  return (
    <div role="group" aria-label={label} className={cn(GRID, className)}>
      {options.map((option) => {
        const on = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => {
              const next = options
                .map((candidate) => candidate.value)
                .filter((candidate) =>
                  candidate === option.value ? !on : selected.has(candidate),
                );
              onChange(next);
            }}
            className={cn(CARD_BASE, on ? CARD_ON : CARD_IDLE)}
          >
            <CardBody option={option} selected={on} />
          </button>
        );
      })}
    </div>
  );
}

function SingleCards({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: Extract<IconCardsProps, { mode: "single" }>) {
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    itemRefs.current[next]?.focus();
    onChange(options[next].value);
  };

  const focusIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div role="radiogroup" aria-label={label} className={cn(GRID, className)}>
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(on ? undefined : option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(CARD_BASE, on ? CARD_ON : CARD_IDLE)}
          >
            <CardBody option={option} selected={on} />
          </button>
        );
      })}
    </div>
  );
}
