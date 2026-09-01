"use client";

import * as React from "react";

import { cn } from "@/core/lib/utils";

/**
 * La casilla del proyecto: `<input type="checkbox">` NATIVA, con estado mixto.
 *
 * **Nativa y no Radix, a propósito.** Hay dieciocho casillas nativas repartidas
 * por el panel y `prerequisites-checklist.tsx` lo documenta como decisión y no
 * como descuido: un `div onClick` no es una casilla para un lector de pantalla
 * ni responde a la barra espaciadora. Meter aquí un `@radix-ui/react-checkbox`
 * —que sustituye el input por un `<button>` con un input escondido— crearía un
 * 19-contra-1 que se ve distinto hasta que alguien migre las dieciocho. Es
 * exactamente el problema que `segmented.tsx` resolvió consolidando 23 copias.
 *
 * Lo que aporta el componente es que **deje de estar copiado**: hoy la misma
 * casilla existe con cinco cadenas de clases distintas (`size-4 accent-primary`,
 * `h-4 w-4 accent-primary`, `size-4 accent-[var(--axi-brand)]`, …), así que
 * cambiar el tratamiento eran cinco ediciones y una oportunidad de que se
 * desincronizaran.
 *
 * **`indeterminate` es propiedad del DOM, no atributo**, así que no se puede
 * pasar por JSX: va por `ref`. Y se acompaña de `aria-checked="mixed"`
 * EXPLÍCITO, porque la propiedad sola no la exponen igual todos los lectores de
 * pantalla — ARIA-in-HTML permite `mixed` en un `input[type=checkbox]`.
 */
export type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  /**
   * Estado mixto: ni marcada ni sin marcar. Lo usa la casilla de cabecera de
   * una tabla cuando solo parte de la página está seleccionada.
   */
  indeterminate?: boolean;
  /**
   * Amplía el área táctil a ≥40px sin agrandar la caja (DESIGN-SYSTEM §10).
   * El pseudo-elemento no pinta nada: solo captura el dedo.
   */
  touchTarget?: boolean;
};

export function Checkbox({
  indeterminate = false,
  touchTarget = false,
  className,
  checked,
  ref,
  ...props
}: CheckboxProps) {
  const inner = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);

  React.useEffect(() => {
    if (inner.current !== null) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inner}
      type="checkbox"
      checked={checked}
      aria-checked={indeterminate ? "mixed" : undefined}
      className={cn(
        "accent-primary size-4 shrink-0 cursor-pointer rounded-sm",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        touchTarget && "relative after:absolute after:-inset-2 md:after:hidden",
        className,
      )}
      {...props}
    />
  );
}
