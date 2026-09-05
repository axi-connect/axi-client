import { createElement, type ReactNode } from "react";
import { Blocks, Building2, KeyRound, MapPin, UserRound, type LucideIcon } from "lucide-react";

import type { SignupStep } from "@/modules/onboarding/domain/signup-draft";

/**
 * Recetario de los controles del campo de `/comenzar` (mockup v3 «Flow»).
 *
 * El material vive en `globals.css` (`.signup-field`, `.sf-glass`…); aquí solo
 * se compone. Los valores arbitrarios apuntan a las variables del bloque, nunca
 * a un color: si el campo cambia de tono, cambia en un solo sitio.
 *
 * `Input` mezcla con `tailwind-merge`: la altura, el radio y el fondo de aquí
 * ganan a los del primitivo. El `dark:bg-*` se repite a propósito porque el
 * primitivo trae `dark:bg-input/30` y, sin él, en oscuro el cristal se lavaba.
 */
export const SIGNUP_INPUT_CLASS =
  "h-14 rounded-[14px] border-[color:var(--sf-line)] bg-[var(--sf-glass)] px-[18px] text-[15px] shadow-none " +
  "dark:bg-[var(--sf-glass)] placeholder:text-[color:var(--sf-soft)] md:text-[15px] " +
  "focus-visible:border-[color:var(--sf-fg)] focus-visible:bg-[var(--sf-glass-hover)] focus-visible:ring-0";

export const SIGNUP_SELECT_CLASS =
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

/** Icono de cada parada de la ruta. Diccionario cerrado: Tailwind y el bundle lo exigen. */
export const SIGNUP_STEP_ICONS: Record<SignupStep, LucideIcon> = {
  offer: Blocks,
  company: Building2,
  location: MapPin,
  owner: UserRound,
  account: KeyRound,
};
