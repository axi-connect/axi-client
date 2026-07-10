/**
 * Presets de movimiento de la marca (DESIGN-SYSTEM §6).
 * Nunca definir duraciones/curvas ad-hoc en componentes: importar de aquí.
 * Toda animación no esencial debe desactivarse con `useReducedMotion()`
 * (framer-motion) o la media query `prefers-reduced-motion` (CSS).
 *
 * Nota: los objetos se tipan estructuralmente (el proyecto declara
 * `framer-motion` como módulo ambient, sin tipos importables); framer-motion
 * los acepta directamente como `transition`.
 */

export const spring = {
  /** Sheets y modales (entrada/salida). */
  soft: { type: "spring", stiffness: 260, damping: 30 },
  /** Popovers, dropdowns y elementos pequeños. */
  snappy: { type: "spring", stiffness: 400, damping: 30 },
} as const

export const fade = {
  /** Listas y cambios de estado. */
  fast: { duration: 0.15, ease: "easeOut" },
  /** Overlays de pantalla completa (splash, scrims). */
  slow: { duration: 0.3, ease: "easeInOut" },
} as const

/** Press de botones e ítems interactivos (`whileTap`). */
export const press = { scale: 0.97 } as const

/** Duraciones canónicas en segundos (hover 150–200ms, fades 150ms). */
export const durations = {
  press: 0.1,
  fade: 0.15,
  hover: 0.2,
} as const

/**
 * Coreografía del splash post-login ("el logo atraviesa la pantalla").
 * Salida: escala hacia la cámara con curva que acelera al final.
 */
export const splash = {
  /** Entrada del logo en el overlay. */
  enter: spring.soft,
  /** Salida "a través de la pantalla": acelera hacia el observador. */
  exit: { duration: 0.9, ease: [0.7, 0, 0.84, 0] as const },
  /** Fade del fondo del overlay al revelar la app. */
  reveal: { duration: 0.45, ease: "easeInOut" },
} as const
