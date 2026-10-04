/**
 * La luz del hero que abraza el marco del video (plan §25), como cuentas puras:
 * el motor (`engine/video-scene.ts`) solo traduce este estado a transform,
 * opacity y el dashoffset de los arcos.
 *
 * Dos progresos de scroll:
 * - `a`, la llegada: de 0 (el borde superior de la escena del video asoma por
 *   abajo) a 1 (la escena queda fijada arriba). Mientras tanto la escena sube
 *   una ventana entera: su borde superior está en `H · (1 − a)`.
 * - `p`, el recorrido fijado de la escena (el mismo que abre el marco, §23).
 *
 * Tramos (escritorio):
 * | Reposo   | a = 0          | El nudo del hero, quieto bajo el CTA.               |
 * | Cae      | 0 → contacto   | La gota relevó al nudo y baja un 14 % del alto.      |
 * | Contacto | u de 0 a 1     | Se aplasta en un destello y los arcos rodean el marco |
 * | Anillo   | u ≥ 1, p < 0,12 | Encendido y respirando.                             |
 * | Se abre  | p 0,12 → 0,72   | Se apaga con la apertura, `(1 − open/0,8)^1,15`.     |
 * | 100 %    | open ≥ 0,8      | Apagado antes de que el borde llegue a los lados.   |
 */

/** El marco en reposo (§23): la escena entera a 0,6, un 9 % bajo el centro, radio 28 px vistos. */
export const FRAME = { scale: 0.6, ty: 0.09, radius: 28 } as const;

export const LIGHT = {
  /** Cuánto baja la gota antes del contacto, en fracción del alto de la ventana. */
  fall: 0.14,
  /** El tramo de `a` en el que cae (acaba justo cuando el marco llega a tocarla). */
  fallUntil: 0.47,
  /** Lo que sube el marco, en fracción del alto, desde que toca la gota hasta cerrar el anillo. */
  contact: 0.22,
  /** El anillo está a 0 con esta apertura: el borde aún no llega a los lados (a 0,8 le faltan ~4 % de ancho). */
  offAt: 0.8,
  /** La caída de la intensidad con la apertura. */
  fadePow: 1.15,
} as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** La apertura del marco con el progreso fijado (la misma cuenta que `video-scene.ts`). */
export const openOf = (p: number) => easeOut(seg(p, 0.12, 0.72));

export type LightInput = {
  /** La llegada (0 → 1). */
  a: number;
  /** El recorrido fijado (0 → 1). */
  p: number;
  /** Alto de la ventana. */
  vh: number;
  /** Alto de la escena (100svh con su mínimo). */
  sh: number;
  /** Dónde estaba el nudo en pantalla con `a = 0` (px desde arriba). */
  knotY: number;
};

export type LightState = {
  /** El borde superior de la escena en pantalla. */
  top: number;
  /** El centro de la gota, en px de la escena. */
  dropY: number;
  /** El contacto sin topar (0 al tocar, 1 con el anillo cerrado; sigue creciendo después). */
  u: number;
  /** Visibilidad de la gota (y el nudo del hero se apaga mientras sea > 0). */
  drop: number;
  /** La gota aplastada contra el filo: escala horizontal y vertical. */
  squash: { x: number; y: number };
  /** El destello anamórfico: opacidad y escala horizontal. */
  flash: { alpha: number; scaleX: number };
  /** Los arcos: cuánto del contorno llevan dibujado (0 → 1) y su opacidad. */
  arcs: { drawn: number; alpha: number; head: number };
  /** La intensidad del anillo (sin la respiración). */
  ring: number;
  /** Cuánto respira (0 durante el contacto). */
  breath: number;
  /** La apertura del marco. */
  open: number;
};

export function lightState({ a, p, vh, sh, knotY }: LightInput): LightState {
  const top = vh * (1 - a);
  const frameTop = sh * (0.5 + FRAME.ty - FRAME.scale / 2); // en px de la escena
  const fallen = knotY + vh * LIGHT.fall * easeInOut(seg(a, 0, LIGHT.fallUntil));
  const u = (fallen - (top + frameTop)) / (vh * LIGHT.contact);
  const c = clamp(u);
  const ec = easeOut(c);
  const open = openOf(p);
  // Antes del contacto, la gota cae; después, se queda sobre el filo, que sigue subiendo.
  const dropY = (u > 0 ? top + frameTop : fallen) - top;
  return {
    top,
    dropY,
    u,
    drop: a > 0 ? 1 - seg(c, 0.25, 0.9) : 0,
    squash: { x: 1 + 2.4 * ec, y: Math.max(0.12, 1 - 0.88 * ec) },
    flash: { alpha: Math.sin(Math.PI * seg(c, 0, 0.55)) * (a > 0 ? 1 : 0), scaleX: 0.35 + 1.45 * easeOut(seg(c, 0, 0.55)) },
    arcs: { drawn: ec, alpha: c > 0 ? 1 - seg(u, 1, 1.35) : 0, head: 1 - seg(c, 0.8, 1) },
    ring: seg(u, 0.55, 1.1) * Math.pow(1 - seg(open, 0, LIGHT.offAt), LIGHT.fadePow),
    breath: seg(u, 1.1, 1.5),
    open,
  };
}
