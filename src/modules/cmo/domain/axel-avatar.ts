/**
 * La cara de Axel: expresiones, pose derivada y variables del rig.
 *
 * TypeScript puro (sin React, sin DOM): es lo que hace que la cara se pueda
 * probar como una tabla de números. El renderer (`AxelAvatar`) solo pinta
 * geometría fija y escribe estas variables en el `style` del `<svg>`; el CSS
 * las convierte en `transform` de un puñado de grupos. Nada de aquí produce un
 * path distinto por expresión: **toda la emoción es transform** (párpados por
 * `scaleY`, boca por `scaleY` sobre la línea del labio, mirada por `translate`,
 * cabeza por parallax). Es la regla de DESIGN-SYSTEM §6 aplicada a un rostro.
 *
 * La geometría se autoró a mano en el mockup aprobado por el dueño
 * (`docs/design/mockups/axel-avatar.html`, 2026-09-15). No hay ni un byte de
 * Avatar Lab aquí: ese proyecto es AGPL y se descartó incluso como herramienta
 * de autoría porque no hizo falta.
 */

export type AxelExpressionName =
  | "neutral"
  | "listening"
  | "thinking"
  | "speaking"
  | "proud"
  | "curious"
  | "sorry"
  | "asleep";

/** Lo que Axel lleva puesto. El dueño lo elige; se guarda como preferencia local. */
export type AxelAccessory = "none" | "headset";

export const AXEL_ACCESSORIES: readonly AxelAccessory[] = ["none", "headset"];

export function isAxelAccessory(value: unknown): value is AxelAccessory {
  return typeof value === "string" && (AXEL_ACCESSORIES as readonly string[]).includes(value);
}

/** Estado de un ojo. Todo en 0..1 salvo `tilt` (grados) y `scale`/`sx` (factores). */
export interface AxelEyeState {
  /** Cuánto baja el párpado superior (0 abierto, 1 cerrado). */
  top: number;
  /** Cuánto sube el párpado inferior: es la «sonrisa con los ojos». */
  bot: number;
  /** Inclinación del párpado superior: hace de ceja (positivo = triste, negativo = enfadado/concentrado). */
  tilt: number;
  /** Compresión horizontal por giro de cabeza (la calcula la pose, no la expresión). */
  sx: number;
  /** Dilatación del ojo entero. */
  scale: number;
}

export interface AxelExpression {
  /** Giro de la cabeza en grados: yaw (izq/der), pitch (arriba/abajo), roll (ladeo). */
  yaw: number;
  pitch: number;
  roll: number;
  /** Multiplicador del parallax; 1 = el del mockup. */
  depth: number;
  /** Separación de cada ojo respecto al centro, en unidades del viewBox. */
  gap: number;
  /** Hacia dónde miran las pupilas, −1..1. */
  gx: number;
  gy: number;
  /** Curvatura de la boca: 1 = sonrisa del mockup, 0 = línea, negativo = tristeza. */
  mouth: number;
  /** Ancho de la boca (factor). */
  mouthW: number;
  /** Apertura de la boca (0 cerrada, 1 abierta). Solo `speaking` la usa. */
  open: number;
  l: AxelEyeState;
  r: AxelEyeState;
}

const EYE_REST: AxelEyeState = { top: 0.02, bot: 0, tilt: 0, sx: 1, scale: 1 };

function eye(over: Partial<AxelEyeState>): AxelEyeState {
  return { ...EYE_REST, ...over };
}

function expression(over: Partial<AxelExpression>): AxelExpression {
  return {
    yaw: 0,
    pitch: 0,
    roll: 0,
    depth: 1,
    gap: 12,
    gx: 0,
    gy: 0,
    mouth: 0.9,
    mouthW: 1,
    open: 0,
    l: EYE_REST,
    r: EYE_REST,
    ...over,
  };
}

/**
 * Las ocho expresiones, tal como se aprobaron en el mockup. Cambiar un número
 * aquí cambia la cara en todo el producto: es el único sitio donde se autora.
 */
export const AXEL_EXPRESSIONS: Readonly<Record<AxelExpressionName, AxelExpression>> = {
  neutral: expression({}),
  listening: expression({
    pitch: 3,
    roll: -3,
    gap: 12.4,
    mouth: 1.05,
    mouthW: 1.05,
    l: eye({ top: 0, scale: 1.06 }),
    r: eye({ top: 0, scale: 1.06 }),
  }),
  thinking: expression({
    yaw: 9,
    pitch: -5,
    gx: 0.9,
    gy: -1,
    mouth: 0.25,
    mouthW: 0.8,
    l: eye({ top: 0.16, tilt: -6 }),
    r: eye({ top: 0.26, tilt: -4 }),
  }),
  speaking: expression({
    pitch: -1,
    mouth: 0.75,
    open: 1,
    l: eye({ top: 0, scale: 1.03 }),
    r: eye({ top: 0, scale: 1.03 }),
  }),
  proud: expression({
    pitch: -6,
    gap: 12.4,
    mouth: 1.35,
    mouthW: 1.18,
    l: eye({ top: 0.08, bot: 0.38, tilt: 4 }),
    r: eye({ top: 0.08, bot: 0.38, tilt: 4 }),
  }),
  curious: expression({
    roll: 7,
    yaw: -6,
    gx: -0.4,
    mouth: 0.5,
    mouthW: 0.75,
    l: eye({ top: 0, scale: 1.16 }),
    r: eye({ top: 0.22, scale: 0.88 }),
  }),
  sorry: expression({
    pitch: 7,
    gy: 0.7,
    mouth: -0.55,
    mouthW: 0.85,
    l: eye({ top: 0.28, tilt: 16, bot: 0.06 }),
    r: eye({ top: 0.28, tilt: 16, bot: 0.06 }),
  }),
  asleep: expression({
    pitch: 9,
    roll: 2,
    gy: 0.4,
    mouth: 0.35,
    mouthW: 0.7,
    l: eye({ top: 0.92, bot: 0.06 }),
    r: eye({ top: 0.92, bot: 0.06 }),
  }),
};

export const AXEL_EXPRESSION_NAMES = Object.keys(AXEL_EXPRESSIONS) as AxelExpressionName[];

/** Curvas con nombre; los valores viven en `core/styles/motion.ts` y en el CSS. */
export type AxelEase = "spring" | "snappy" | "smooth";

export interface AxelPoseOptions {
  /** Duración del viaje entre poses. 0 = salto (reduced-motion, primer pintado). */
  transitionMs: number;
  ease: AxelEase;
}

/** Variables CSS del rig, listas para el `style` del `<svg>`. */
export type AxelPoseStyle = Record<`--axel-${string}`, string>;

const round = (value: number, digits = 3): string => {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
};

/**
 * Pose → variables. Aquí se derivan los números que dependen de la geometría y
 * no de la intención: la cara se comprime en X al girar y el ojo lejano más, y
 * la separación entre ojos baja con el coseno del giro. La expresión no tiene
 * que saberlo; solo dice «gira 9 grados».
 */
export function resolvePoseStyle(name: AxelExpressionName, options: AxelPoseOptions): AxelPoseStyle {
  const p = AXEL_EXPRESSIONS[name];
  // ×2.2: el rango real del yaw es ±22°, y el coseno «geométrico» de 22° apenas
  // se nota. Exagerarlo es lo que hace que el giro se lea a 136 px.
  const cos = Math.cos((p.yaw * Math.PI) / 180 * 2.2);
  const far = p.yaw > 0 ? "l" : "r";
  const style: AxelPoseStyle = {
    "--axel-yaw": round(p.yaw),
    "--axel-pitch": round(p.pitch),
    "--axel-roll": round(p.roll),
    "--axel-depth": round(p.depth),
    "--axel-face-sx": round(0.94 + 0.06 * cos),
    "--axel-gap": round(p.gap * (0.86 + 0.14 * cos), 2),
    "--axel-gx": round(p.gx),
    "--axel-gy": round(p.gy),
    "--axel-mouth": round(p.mouth),
    "--axel-mouth-w": round(p.mouthW),
    "--axel-open": round(p.open),
    "--axel-dur": `${String(options.transitionMs)}ms`,
    "--axel-ease": `var(--axel-ease-${options.ease})`,
  };
  for (const side of ["l", "r"] as const) {
    const e = p[side];
    const squeeze = side === far ? 1 - Math.abs(p.yaw) * 0.012 : 1;
    style[`--axel-${side}-top`] = round(e.top);
    style[`--axel-${side}-bot`] = round(e.bot);
    style[`--axel-${side}-tilt`] = round(e.tilt);
    style[`--axel-${side}-sx`] = round(e.sx * squeeze);
    style[`--axel-${side}-scale`] = round(e.scale);
  }
  return style;
}

/**
 * Parpadeo: solo mientras Axel trabaja (DESIGN-SYSTEM §6: en reposo nada se
 * mueve solo). Intervalo humano, irregular a propósito: uno regular se lee
 * como un metrónomo.
 */
export const AXEL_BLINK = {
  minIntervalMs: 2_200,
  maxIntervalMs: 4_800,
  durationMs: 170,
  /** Probabilidad de que un parpadeo venga doble. */
  doubleChance: 0.25,
  doubleGapMs: 220,
} as const;

/** Sacadas de la mirada mientras piensa: pequeñas, hacia arriba, cada 0,7–1,6 s. */
export const AXEL_SACCADE = {
  minIntervalMs: 700,
  maxIntervalMs: 1_600,
  x: [-0.6, 0.9] as const,
  y: [-0.8, 0.2] as const,
} as const;

export function nextBlinkDelayMs(random: () => number = Math.random): number {
  return Math.round(AXEL_BLINK.minIntervalMs + random() * (AXEL_BLINK.maxIntervalMs - AXEL_BLINK.minIntervalMs));
}

export function nextSaccade(random: () => number = Math.random): { delayMs: number; x: number; y: number } {
  const lerp = (a: number, b: number) => a + random() * (b - a);
  return {
    delayMs: Math.round(lerp(AXEL_SACCADE.minIntervalMs, AXEL_SACCADE.maxIntervalMs)),
    x: Number(lerp(AXEL_SACCADE.x[0], AXEL_SACCADE.x[1]).toFixed(2)),
    y: Number(lerp(AXEL_SACCADE.y[0], AXEL_SACCADE.y[1]).toFixed(2)),
  };
}
