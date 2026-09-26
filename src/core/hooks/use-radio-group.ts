"use client";

import { useRef } from "react";

/**
 * Teclado de un `role="radiogroup"` hecho con botones (patrón ARIA): un solo
 * tabulador —la opción elegida, o la primera si no hay— y las flechas mueven
 * y eligen, con vuelta al principio. Inicio y Fin van a los extremos.
 *
 * Devuelve las props de cada opción; el grupo pone `role`, el nombre y lo
 * visual.
 */
export function useRadioGroup<T extends string>(
  values: readonly T[],
  value: T | null,
  onChange: (next: T) => void,
): (option: T) => {
  tabIndex: 0 | -1;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  ref: (node: HTMLElement | null) => void;
} {
  const nodes = useRef(new Map<T, HTMLElement>());
  const focusable =
    value !== null && values.includes(value) ? value : values[0];

  return (option) => ({
    tabIndex: option === focusable ? 0 : -1,
    ref: (node) => {
      if (node === null) nodes.current.delete(option);
      else nodes.current.set(option, node);
    },
    onKeyDown: (event) => {
      const at = values.indexOf(option);
      const next =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? values[(at + 1) % values.length]
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? values[(at - 1 + values.length) % values.length]
            : event.key === "Home"
              ? values[0]
              : event.key === "End"
                ? values[values.length - 1]
                : undefined;
      if (next === undefined) return;
      event.preventDefault();
      onChange(next);
      nodes.current.get(next)?.focus();
    },
  });
}
