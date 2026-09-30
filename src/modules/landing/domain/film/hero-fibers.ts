/**
 * Las fibras del hero A, «Mil conversaciones, un hilo» (plan §14, lienzo
 * aprobado el 2026-09-30). TypeScript puro, sin DOM: la UI (`HeroFibers`) solo
 * dibuja lo que esto calcula.
 *
 * Cada fibra es una conversación que entra por un borde y llega a un nudo bajo
 * el CTA, donde se enciende la marca. (Del nudo nacía el hilo de luz; el hilo
 * quedó archivado, plan §15: al salir, el nudo baja, encoge y se apaga.) Cada fibra es
 * una curva cuadrática del origen al nudo, con el control hacia el origen y
 * desplazado hacia abajo, para que todas caigan en el nudo como un haz.
 *
 * Los tiempos van en segundos desde la carga (la entrada) y el progreso de
 * salida `s` va de 0 a 1 con el scroll del hero.
 */

export type Point = { x: number; y: number };

export type HeroFiber = {
  from: Point;
  control: Point;
  /** Cuándo nace, en segundos desde la carga. */
  delay: number;
  /** Grosor en px CSS. */
  width: number;
  /** Opacidad de la fibra (blanco). */
  alpha: number;
  /** Índice de la pregunta que lleva (solo en escritorio), o `null`. */
  label: number | null;
};

export type HeroFiberLayout = { width: number; height: number; desktop: boolean };

/** El nudo: centrado, al 68 % del alto (69 % en móvil). Coincide con la primera ancla del hilo. */
export function knotOf({ width, height, desktop }: HeroFiberLayout): Point {
  return { x: width / 2, y: height * (desktop ? 0.68 : 0.69) };
}

/** Cuántas fibras: 56 en escritorio y 30 por debajo de 1024 px. */
export const FIBER_COUNT = { desktop: 56, mobile: 30 } as const;

/** Las fibras con pregunta visible: de los bordes laterales, lejos del titular. */
const LABELED = [0, 1, 4, 5, 8, 9, 12, 13] as const;
export const LABEL_COUNT = LABELED.length;

export const HERO_TIMING = {
  /** Cada fibra tarda esto en llegar al nudo. */
  travel: 1.2,
  /** El nudo se enciende. */
  knot: [1.4, 2.1],
  /** La pregunta aparece al nacer su fibra y se apaga mientras llega (tiempos del lienzo). */
  labelIn: 0.32,
  labelOut: [1.04, 1.44],
  /** Todo quieto a partir de aquí: el bucle de la entrada se detiene. */
  end: 2.6,
} as const;

/** Salida por scroll (`s` de 0 a 1 en el hero): las fibras se recogen hasta 0,65. */
export const HERO_EXIT = { gather: 0.65, knotDrop: 330, knotShrink: 60 } as const;

/** Generador determinista (el mismo haz en cada visita), como el del lienzo. */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Las fibras para una ventana. En escritorio salen de cuatro bordes (izquierda,
 * derecha, abajo a la izquierda y abajo a la derecha) y en móvil de los dos
 * laterales. Las medidas del lienzo (1440 × 900 y 390 × 844) se llevan a
 * fracciones de la ventana.
 */
export function heroFibers(layout: HeroFiberLayout): HeroFiber[] {
  const { width: W, height: H, desktop } = layout;
  const knot = knotOf(layout);
  const count = desktop ? FIBER_COUNT.desktop : FIBER_COUNT.mobile;
  return Array.from({ length: count }, (_, i) => {
    const u = noise(i);
    let from: Point;
    if (desktop) {
      const side = i % 4;
      if (side === 0) from = { x: -30, y: H * (0.133 + u * 0.778) };
      else if (side === 1) from = { x: W + 30, y: H * (0.133 + u * 0.778) };
      else if (side === 2) from = { x: u * W * 0.389, y: H + 30 };
      else from = { x: W * 0.611 + u * W * 0.389, y: H + 30 };
    } else {
      from = { x: i % 2 === 0 ? -20 : W + 20, y: H * (0.107 + u * 0.877) };
    }
    const pull = desktop ? 0.28 + noise(i + 90) * 0.2 : 0.3 + noise(i + 9) * 0.2;
    const control = {
      x: knot.x + (from.x - knot.x) * pull,
      y: desktop ? knot.y + (from.y - knot.y) * 0.12 + 60 + noise(i + 40) * 90 : knot.y + (from.y - knot.y) * 0.15 + 40,
    };
    const labelIndex = desktop ? LABELED.indexOf(i as (typeof LABELED)[number]) : -1;
    return {
      from,
      control,
      delay: 0.12 + noise(i + 7) * 0.8,
      width: desktop ? 0.5 + noise(i + 3) * 0.7 : 0.5 + noise(i + 3) * 0.6,
      alpha: desktop ? 0.1 + noise(i + 5) * 0.22 : 0.08 + noise(i + 5) * 0.18,
      label: labelIndex >= 0 ? labelIndex : null,
    };
  });
}

/** Un punto de la cuadrática origen → control → nudo, con `k` de 0 a 1. */
export function fiberPoint(f: HeroFiber, knot: Point, k: number): Point {
  const a = (1 - k) * (1 - k);
  const b = 2 * (1 - k) * k;
  const c = k * k;
  return { x: a * f.from.x + b * f.control.x + c * knot.x, y: a * f.from.y + b * f.control.y + c * knot.y };
}

/**
 * El tramo [t0, t1] de la cuadrática como otra cuadrática (de Casteljau):
 * `{ start, control, end }`, listo para `quadraticCurveTo`.
 */
export function fiberSegment(f: HeroFiber, knot: Point, t0: number, t1: number): { start: Point; control: Point; end: Point } {
  const start = fiberPoint(f, knot, t0);
  const end = fiberPoint(f, knot, t1);
  // Derivada en t0, escalada al tramo: el control del subtramo.
  const d = {
    x: 2 * (1 - t0) * (f.control.x - f.from.x) + 2 * t0 * (knot.x - f.control.x),
    y: 2 * (1 - t0) * (f.control.y - f.from.y) + 2 * t0 * (knot.y - f.control.y),
  };
  const span = (t1 - t0) / 2;
  return { start, control: { x: start.x + d.x * span, y: start.y + d.y * span }, end };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** El estado de una fibra en el instante `t` (s) con salida `s`: qué tramo se ve y dónde va su luz. */
export function fiberState(f: HeroFiber, t: number, s: number): { from: number; to: number; head: boolean; label: number } {
  const to = easeOut(seg(t, f.delay, f.delay + HERO_TIMING.travel));
  const from = Math.min(to, easeOut(seg(s, 0, HERO_EXIT.gather)));
  const label =
    easeOut(seg(t, f.delay, f.delay + HERO_TIMING.labelIn)) *
    (1 - easeOut(seg(t, f.delay + HERO_TIMING.labelOut[0], f.delay + HERO_TIMING.labelOut[1])));
  return { from, to, head: to > 0.01 && to < 0.99, label };
}

/** El nudo en el instante `t` con salida `s`: centro, radio y opacidad. */
export function knotState(knot: Point, t: number, s: number): { x: number; y: number; r: number; alpha: number } {
  const on = easeOut(seg(t, HERO_TIMING.knot[0], HERO_TIMING.knot[1]));
  const out = easeOut(clamp(s));
  return {
    x: knot.x,
    y: knot.y + HERO_EXIT.knotDrop * out,
    r: Math.max(0, 30 + 110 * on - HERO_EXIT.knotShrink * out),
    alpha: on * (1 - out),
  };
}
