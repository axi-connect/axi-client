import { createElement, type ReactNode } from "react";

/**
 * Recetario de los controles «Flow». El material vive en `globals.css` y tiene
 * dos alcances con el MISMO vocabulario `--sf-*`: `.signup-field` (el campo
 * coral de `/comenzar`) y `.flow-ground` (el suelo del panel en `/onboarding`).
 * Aquí solo se compone: los valores arbitrarios apuntan a esas variables, nunca
 * a un color, así el mismo `Input` sale de cristal blanco sobre el campo y de
 * superficie sólida sobre el suelo sin una variante.
 *
 * `Input` mezcla con `tailwind-merge`: la altura, el radio y el fondo de aquí
 * ganan a los del primitivo. El `dark:bg-*` se repite a propósito porque el
 * primitivo trae `dark:bg-input/30` y, sin él, en oscuro el cristal se lavaba.
 */
export const FLOW_INPUT_CLASS =
  "h-14 rounded-[14px] border-[color:var(--sf-line)] bg-[var(--sf-glass)] px-[18px] text-[15px] shadow-none " +
  "dark:bg-[var(--sf-glass)] placeholder:text-[color:var(--sf-soft)] md:text-[15px] " +
  "focus-visible:border-[color:var(--sf-fg)] focus-visible:bg-[var(--sf-glass-hover)] focus-visible:ring-0";

export const FLOW_SELECT_CLASS =
  "h-14! w-full rounded-[14px] border-[color:var(--sf-line)] bg-[var(--sf-glass)] px-[18px] text-[15px] shadow-none " +
  "dark:bg-[var(--sf-glass)] dark:hover:bg-[var(--sf-glass-hover)] focus-visible:border-[color:var(--sf-fg)] focus-visible:ring-0 " +
  "[&_svg]:text-[color:var(--sf-soft)]";

/**
 * Etiqueta solo para el lector de pantalla: la pregunta grande de la pantalla
 * es la etiqueta visible y el placeholder nombra cada control (patrón del
 * mockup). `getByLabelText` y el lector siguen encontrando el campo.
 */
export function SrLabel({ children }: { children: ReactNode }) {
  return createElement("span", { className: "sr-only" }, children);
}
