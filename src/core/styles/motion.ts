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
 * Coreografía del splash post-login ("se entra por el ojo de la α").
 * NOTA: las fases del splash están implementadas como animaciones CSS en
 * `globals.css` (`splash-in`, `splash-exit`, `brand-pulse`) y NO con
 * framer-motion: transform/opacity en CSS corren en el compositor, así el
 * zoom no se congela mientras la página destino hidrata. Estos valores
 * documentan la coreografía y deben mantenerse en sincronía con el CSS.
 */
/**
 * Coreografía del pin-reveal de `/productos` (§#agente): una sección alta con
 * hijo sticky cuyo progreso de scroll (0→1 sobre el contenedor
 * `[data-app-scroll]`) reparte titular cinético, expansión del medio y pills.
 * Los rangos viven aquí para que la sección no defina números ad-hoc.
 *
 * EXCEPCIÓN DOCUMENTADA (DESIGN-SYSTEM §6): la expansión anima `clip-path`,
 * que no es transform/opacity. Se concede porque es UNA superficie, guiada por
 * scroll (sin reloj propio), con `will-change: clip-path` los navegadores
 * Blink/WebKit la componen fuera del hilo principal, y la alternativa (scale
 * sobre máscara redonda) deforma el contenido revelado. Con reduced-motion la
 * sección colapsa a su estado final estático.
 */
export const scrollReveal = {
  /** Offset del useScroll del track: progreso 0→1 mientras la sección está pineada. */
  offset: ["start start", "end end"] as const,
  /** Altura del track (vh) — cuánto scroll “dura” la escena. */
  trackVh: 280,
  /** Titular palabra a palabra. */
  title: { from: 0.02, step: 0.03, span: 0.1 },
  /** Subtítulo. */
  sub: { from: 0.1, to: 0.18 },
  /** Expansión del círculo (clip-path). */
  media: { from: 0.18, to: 0.62, circleFrom: "circle(7% at 50% 50%)", circleTo: "circle(120% at 50% 50%)" },
  /** Desvanecimiento del isotipo al abrirse el círculo. */
  emblem: { from: 0.26, to: 0.42 },
  /** Pills de herramientas, escalonadas. */
  pills: { from: 0.6, step: 0.012, span: 0.1 },
} as const

export const splash = {
  /** Entrada del logo (`splash-in`): 0.45s cubic-bezier(0.16, 1, 0.3, 1). */
  enter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  /** Salida (`splash-exit`): escala 1→80 con origen en el ojo de la α. */
  exit: { duration: 1.1, ease: [0.55, 0, 0.85, 0.15] as const },
  /** Fade del fondo del overlay al revelar la app. */
  reveal: { duration: 0.3, ease: "easeOut" },
} as const
