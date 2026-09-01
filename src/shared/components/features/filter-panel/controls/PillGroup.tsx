"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { FilterOption } from "../filter-schema";

/**
 * Pastillas de opción del panel de filtros, en sus dos semánticas.
 *
 * Las dos viven en un fichero porque comparten el recetario visual y separarlas
 * habría dejado dos copias de él —el problema exacto que `segmented.tsx`
 * resolvió consolidando 23—. Lo que NO comparten es la semántica, y esa es la
 * mitad importante:
 *
 * | modo | qué es | ARIA |
 * |---|---|---|
 * | `multi` | conmutadores independientes | `<button aria-pressed>`, cada uno un tab stop |
 * | `single` | elige una de varias, sin panel | `role="radiogroup"` + tabindex móvil |
 *
 * Nunca `role="radio"` para un conmutador no excluyente (prometería que elegir
 * uno apaga los otros) ni `role="tab"` sin `tabpanel`.
 *
 * **Lo seleccionado se marca por ELEVACIÓN, no por tinte**: fondo `background`,
 * `shadow-float` y borde más firme. El coral aparece únicamente en la marca de
 * verificación, que mide 14px. Razón dura: blanco sobre `--axi-brand` da ~3.1:1
 * y no pasa AA a 12–13px, y un relleno coral detrás de una etiqueta pequeña es
 * justo eso. Es una desviación consciente del recetario de pestañas de §9.3,
 * que sí permite `bg-accent`: aquí hay decenas de pastillas en una hoja y el
 * tinte al 14 % repetido convierte el panel en un damero.
 */

const PILL_BASE = [
  "relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3",
  "text-sm font-medium whitespace-nowrap outline-none",
  "transition-[background-color,border-color,box-shadow,color] duration-200",
  "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/** Apagada: se lee como hueco, no como control desactivado. */
const PILL_IDLE = "border-border-soft bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground";

/** Encendida: elevación. Ni un relleno de color. */
const PILL_ON = "border-border bg-background text-foreground shadow-float";

export function pillClassName(selected: boolean, className?: string) {
  return cn(PILL_BASE, selected ? PILL_ON : PILL_IDLE, className);
}

/** Contenido común: punto tonal, icono, etiqueta y la marca coral. */
function PillBody({ option, selected }: { option: FilterOption; selected: boolean }) {
  const Icon = option.icon;
  return (
    <React.Fragment>
      {option.dotClassName ? (
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dotClassName)} />
      ) : null}
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
      <span>{option.label}</span>
      {selected ? <Check aria-hidden="true" className="text-brand size-3.5 shrink-0" /> : null}
    </React.Fragment>
  );
}

type PillGroupProps = {
  /** Nombre del grupo para el lector de pantalla. Obligatorio. */
  label: string;
  options: readonly FilterOption[];
  disabled?: boolean;
  className?: string;
} & (
  | { mode: "multi"; value: readonly string[]; onChange: (next: string[]) => void }
  | { mode: "single"; value: string | undefined; onChange: (next: string | undefined) => void }
);

export function PillGroup(props: PillGroupProps) {
  return props.mode === "multi" ? <MultiPills {...props} /> : <SinglePills {...props} />;
}

function MultiPills({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: Extract<PillGroupProps, { mode: "multi" }>) {
  const selected = new Set(value);

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const on = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            // `aria-pressed` y no `aria-checked`: son conmutadores independientes.
            aria-pressed={on}
            disabled={disabled}
            title={option.hint}
            onClick={() => {
              const next = options
                .map((candidate) => candidate.value)
                .filter((candidate) =>
                  candidate === option.value ? !on : selected.has(candidate),
                );
              onChange(next);
            }}
            className={pillClassName(on)}
          >
            <PillBody option={option} selected={on} />
          </button>
        );
      })}
    </div>
  );
}

function SinglePills({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: Extract<PillGroupProps, { mode: "single" }>) {
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    itemRefs.current[next]?.focus();
    onChange(options[next].value);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      move(index, step);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? options[0].value : options[options.length - 1].value);
    }
  };

  // Sin valor, el tab stop es el primero: un radiogroup vacío tiene que ser
  // alcanzable con el tabulador o el filtro no existe para el teclado.
  const focusIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
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
            title={option.hint}
            // Tabindex móvil: el grupo entero es UNA parada de tabulación y las
            // flechas recorren las opciones (patrón ARIA de radiogroup).
            tabIndex={index === focusIndex ? 0 : -1}
            // Volver a pulsar la elegida la quita. Un filtro TIENE que poder
            // vaciarse, y exigir una opción «Cualquiera» en cada esquema es una
            // opción de más en la pantalla para decir lo mismo.
            onClick={() => onChange(on ? undefined : option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={pillClassName(on)}
          >
            <PillBody option={option} selected={on} />
          </button>
        );
      })}
    </div>
  );
}
