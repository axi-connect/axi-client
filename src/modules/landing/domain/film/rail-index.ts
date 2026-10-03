/**
 * El riel como temario (lienzo «Landing · Riel temario» v2, aprobado por la
 * dueña el 2026-10-01: «Aprobada la ruleta, constrúyela»). Puro: el índice de
 * escenas y la matemática del tambor y del recorrido.
 *
 * - Cada escena con su ancla real (`id` de su `<section>`), su capítulo y el
 *   punto de su pilar, como en el nav en isla: ámbar captar y crecer, coral
 *   vender y cobrar, violeta lo que es atender (la llamada y el equipo).
 * - El tambor: la escena del centro va grande y nítida; las demás se achican y
 *   se apagan con la distancia. Solo transform y opacity.
 * - La rueda mueve el tambor a pasos de 60 px; el recorrido dura según la
 *   distancia, entre 1,2 y 2,5 s.
 */

export type RailTone = "amber" | "coral" | "violet" | "dim";

export type RailEntry = {
  /** El `id` de la `<section>` de la escena: el destino del recorrido. */
  id: string;
  /** El `data-scene`, para saber cuál es la actual. */
  scene: string;
  chapter: string;
  title: string;
  tone: RailTone;
};

/** En el orden de la película (el riel lista lo que hay en la página). */
export const RAIL_INDEX: readonly RailEntry[] = [
  { id: "hero", scene: "hero", chapter: "Empieza", title: "Vende en cada conversación", tone: "dim" },
  { id: "video", scene: "video", chapter: "Empieza", title: "Así se ve Axi", tone: "dim" },
  { id: "quien", scene: "niche", chapter: "Empieza", title: "¿Quién te escribe hoy?", tone: "dim" },
  { id: "captar", scene: "radar", chapter: "Captar", title: "Encuentra a quien te va a comprar", tone: "amber" },
  { id: "piloto", scene: "pilot", chapter: "Captar", title: "Tu captación en piloto automático", tone: "amber" },
  { id: "seguimiento", scene: "followup", chapter: "Captar", title: "Nadie se queda esperando", tone: "amber" },
  { id: "vender", scene: "chat", chapter: "Vender", title: "Responde en segundos", tone: "coral" },
  { id: "foto", scene: "photo", chapter: "Vender", title: "Una foto basta", tone: "coral" },
  { id: "llamada", scene: "call", chapter: "Vender", title: "Y si te llaman, contesta", tone: "violet" },
  { id: "garantias", scene: "vault", chapter: "Vender", title: "Nunca inventa un precio", tone: "coral" },
  { id: "equipo", scene: "team", chapter: "Vender", title: "Cuando hace falta una persona", tone: "violet" },
  { id: "cobrar", scene: "collect", chapter: "Cobrar", title: "Cada venta, cobrada", tone: "coral" },
  { id: "ordenar", scene: "pipeline", chapter: "Cobrar", title: "Todo queda en su lugar", tone: "coral" },
  { id: "crecer", scene: "goal", chapter: "Crecer", title: "Tu meta del mes", tone: "amber" },
  { id: "axel", scene: "axel", chapter: "Crecer", title: "Cada mañana, un plan", tone: "amber" },
  { id: "medir", scene: "measure", chapter: "Crecer", title: "Sabes cuánto te vendió", tone: "amber" },
  { id: "planes", scene: "pricing", chapter: "Después", title: "Empieza gratis", tone: "dim" },
  { id: "preguntas", scene: "faq", chapter: "Después", title: "Lo que nos preguntan", tone: "dim" },
  { id: "demo", scene: "close", chapter: "Después", title: "Empieza hoy", tone: "dim" },
];

export const RAIL_COPY = {
  label: "Escenas de la película",
  open: "Ir a una escena",
  toward: "Hacia",
} as const;

/** El tambor (lienzo v2): 272 × 236, filas de 46 px, cinco a la vista. */
/**
 * `bump`: la fila del centro es más alta (su título puede ir en dos líneas,
 * pedido de diseño del 2026-10-01) y aparta a las demás esa distancia.
 */
export const DRUM = { width: 272, height: 236, row: 46, bump: 8, wheelStep: 60, snapMs: 420 } as const;

/** Más allá de esto la fila no se ve (y no se anima). */
const HIDDEN_AT = 3.4;

export type DrumPose = { y: number; scale: number; opacity: number; hidden: boolean };

/** La pose de una fila a `d` filas del centro: −12 % de escala y −30 % de opacidad por paso. */
export function drumPose(d: number): DrumPose {
  const a = Math.abs(d);
  const y = d * DRUM.row + Math.sign(d) * DRUM.bump;
  if (a > HIDDEN_AT) return { y, scale: 0.72, opacity: 0, hidden: true };
  return { y, scale: Math.max(0.72, 1 - 0.12 * a), opacity: Math.max(0, 1 - 0.3 * a), hidden: false };
}

/**
 * La rueda acumula y avanza a pasos enteros de `DRUM.wheelStep` px; lo que
 * sobra queda para el siguiente giro (así un trackpad suave no salta filas).
 */
export function wheelStep(acc: number, deltaY: number, step = DRUM.wheelStep): { steps: number; acc: number } {
  const total = acc + deltaY;
  const steps = Math.trunc(total / step);
  return { steps, acc: total - steps * step };
}

/** Acota una selección a la lista. */
export function clampIndex(i: number, length: number): number {
  return Math.min(length - 1, Math.max(0, i));
}

/**
 * La duración del recorrido, proporcional a la distancia: 1,2 s para una
 * escena vecina y hasta 2,5 s para cruzar la película (≈ 20 pantallas).
 */
export function travelSeconds(distancePx: number, viewportPx: number): number {
  const screens = Math.abs(distancePx) / Math.max(1, viewportPx);
  return Math.min(2.5, Math.max(1.2, 1.2 + (1.3 * screens) / 20));
}

/** El easing del recorrido: entra y sale suave (in-out quart). */
export const travelEase = (t: number): number => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

/** La escena actual: la última cuyo comienzo ya cruzó la mitad de la ventana. `tops` en px de scroll. */
export function currentIndex(tops: readonly number[], scrollTop: number, viewportPx: number): number {
  let current = 0;
  tops.forEach((t, i) => {
    if (scrollTop + viewportPx * 0.5 >= t) current = i;
  });
  return current;
}
