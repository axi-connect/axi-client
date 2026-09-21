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
 * Coreografía de la escena pineada de `/productos` (§#agente): una sección
 * alta con hijo sticky cuyo progreso de scroll (0→1 sobre el contenedor
 * `[data-app-scroll]`) reparte titular cinético, entrada del dispositivo y la
 * conversación de la demo. Los rangos viven aquí para que la sección no
 * defina números ad-hoc.
 *
 * La entrada del dispositivo es «Lift & Scale» (opción A elegida por el dueño
 * sobre el comparador de coreografías, 2026-08-27 — estilo página de producto
 * de Apple), más un giro en perspectiva que lo endereza: sube, crece, se
 * aclara y se pone de frente. Solo transform y opacity — DESIGN-SYSTEM §6 sin
 * excepciones.
 */
export const scrollReveal = {
  /** Offset del useScroll del track: progreso 0→1 mientras la sección está pineada. */
  offset: ["start start", "end end"] as const,
  /**
   * Altura del track (vh) — cuánto scroll “dura” la escena. Doce mensajes
   * necesitan recorrido: a 280vh cada uno duraba ~70px de scroll y la escena
   * se sentía nerviosa.
   */
  trackVh: 340,
  /** Titular palabra a palabra. */
  title: { from: 0.02, step: 0.03, span: 0.1 },
  /** Subtítulo (y con él, la tarjeta de foco). */
  sub: { from: 0.1, to: 0.18 },
  /** Entrada del dispositivo: sube liftPct% mientras escala, aclara y gira. */
  media: {
    from: 0.12,
    to: 0.3,
    liftPct: 14,
    scaleFrom: 0.8,
    opacityFrom: 0.25,
    rotateFrom: -13,
  },
  /**
   * Un mensaje por paso de scroll. El mensaje `i` entra al cruzar la MITAD de
   * su tramo: así aparece de golpe, como un mensaje real, en vez de
   * desvanecerse a medias mientras el dedo sigue bajando.
   */
  messages: { from: 0.3, step: 0.052, span: 0.05 },
} as const

export const splash = {
  /** Entrada del logo (`splash-in`): 0.45s cubic-bezier(0.16, 1, 0.3, 1). */
  enter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  /** Salida (`splash-exit`): escala 1→80 con origen en el ojo de la α. */
  exit: { duration: 1.1, ease: [0.55, 0, 0.85, 0.15] as const },
  /** Fade del fondo del overlay al revelar la app. */
  reveal: { duration: 0.3, ease: "easeOut" },
} as const

/**
 * Escenario del onboarding «Flow» (2026-09-05). `drain`: el campo coral de la
 * bienvenida se hunde (`translateY(100%)`) y descubre el suelo del panel ya
 * pintado debajo; solo transform. `rise`: la ruta sube desde abajo en el primer
 * paso, un poco después de que el campo empiece a caer. `lightEvery`: cadencia
 * con la que «Listo» enciende las paradas hechas; `staggerEvery`: la del
 * resumen que entra detrás. En segundos, como todo lo de este fichero.
 */
export const flowStage = {
  drain: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const },
  rise: { ...spring.soft, delay: 0.25 },
  lightEvery: 0.14,
  staggerEvery: 0.08,
} as const

/**
 * Muestrea un resorte (masa 1) como curva CSS `linear()`: el mismo rebote que
 * framer da a `spring.soft`/`spring.snappy`, pero ejecutado por el compositor y
 * sin JavaScript por frame. Muestreo hasta que la amplitud baja de 0,1 %.
 */
export function springToLinear(stiffness: number, damping: number, samples = 28): string {
  const w0 = Math.sqrt(stiffness)
  const zeta = damping / (2 * Math.sqrt(stiffness))
  const wd = w0 * Math.sqrt(1 - zeta * zeta)
  const x = (t: number) =>
    Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  let duration = 0.05
  while (Math.abs(x(duration)) > 0.001 && duration < 3) duration += 0.01
  const points = Array.from({ length: samples + 1 }, (_, i) =>
    i === samples ? 1 : Math.round((1 - x((duration * i) / samples)) * 10000) / 10000,
  )
  return `linear(${points.map((p) => String(p)).join(", ")})`
}

/**
 * Curvas CSS de la cara de Axel (módulo CMO). Como en el splash, la
 * implementación real vive en `globals.css` (`--av-ease-*`, en el bloque `.assistant-avatar` del kit de asistente) porque el
 * `@supports` de `linear()` solo puede resolverse allí; estos valores documentan
 * la coreografía y un test comprueba que el CSS no se ha desincronizado.
 * `spring` ≡ `spring.soft` (260/30, ~430 ms) · `snappy` ≡ `spring.snappy` (400/30, ~400 ms).
 */
export const cssEase = {
  spring: springToLinear(spring.soft.stiffness, spring.soft.damping),
  snappy: springToLinear(spring.snappy.stiffness, spring.snappy.damping),
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Navegadores sin `linear()`: la curva «salida» ya usada en el módulo. */
  fallback: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const
