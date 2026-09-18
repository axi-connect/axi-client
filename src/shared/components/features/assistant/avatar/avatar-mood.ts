import type { AssistantExpressionName } from "./avatar-rig";

/**
 * El humor del asistente: qué cara pone según lo que está pasando en el hilo.
 *
 * Es una función pura sobre una instantánea de PRIMITIVOS. Eso no es purismo:
 * es lo que permite que el hook de cada slice la alimente con un selector
 * superficial y que el avatar no se re-renderice en cada delta del streaming
 * (el texto crece decenas de veces por respuesta; el humor cambia dos). El
 * servidor no envía tono ni sentimiento y este módulo no lo pide: todo se
 * deriva de señales que el store ya tiene.
 *
 * Los roles son los del kit (`user` / `assistant` / `system`): cada slice
 * traduce los suyos (`owner`/`axel` en cmo, `client`/`assistant` en intake).
 */
export type AssistantMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "proud"
  | "curious"
  | "sorry"
  | "asleep";

export type AssistantGesture = "wink" | "wave" | "nod";

export interface AssistantMoodInput {
  /** Cualquier motivo por el que el asistente no está disponible. */
  blocker: string | null;
  thinking: boolean;
  /** `live.text.length > 0` — un boolean, nunca el texto. */
  streaming: boolean;
  lastMessage: {
    role: "user" | "assistant" | "system";
    failed: boolean;
    hasProposal: boolean;
    hasQuestion: boolean;
  } | null;
  /** Foco en el compositor o borrador sin enviar. */
  ownerTyping: boolean;
  /** true durante `PROUD_MS` tras una buena noticia; lo pone el hook con su reloj. */
  celebrating: boolean;
}

/** Cuánto dura el orgullo por una propuesta recién armada (o un trabajo terminado). */
export const PROUD_MS = 6_000;
/** Duración de cada gesto; el hook los apaga por temporizador, no por `animationend`. */
export const GESTURE_MS: Readonly<Record<AssistantGesture, number>> = { wink: 600, nod: 500, wave: 900 };
/**
 * Ventana para contar toques seguidos y cooldown tras un gesto. La ventana
 * tiene que superar dos guiños completos con su cooldown (2 × 850 ms): con
 * 1,5 s el tercer toque nunca llegaba a tiempo y el saludo era inalcanzable.
 */
export const TAP_WINDOW_MS = 2_500;
export const TAP_COOLDOWN_MS = 250;
export const EASTER_EGG_TAPS = 3;

/**
 * Prioridades, de arriba abajo. La primera que aplica gana.
 *
 * `listening` está por encima de `curious`/`proud` a propósito: teclear es la
 * señal más reciente de la persona, y una cara que sigue «preguntando» mientras
 * le estás contestando lee como que no escucha.
 */
export function resolveAssistantMood(input: AssistantMoodInput): AssistantMood {
  if (input.blocker !== null) return "asleep";
  const last = input.lastMessage;
  if (last !== null && last.role === "user" && last.failed) return "sorry";
  if (input.thinking && !input.streaming) return "thinking";
  if (input.thinking && input.streaming) return "speaking";
  if (input.ownerTyping) return "listening";
  if (input.celebrating) return "proud";
  if (last !== null && last.role === "assistant" && last.hasQuestion) return "curious";
  return "idle";
}

/** Humor → expresión del rig. Hoy coinciden uno a uno; el mapa existe para que puedan dejar de hacerlo. */
export const MOOD_EXPRESSION: Readonly<Record<AssistantMood, AssistantExpressionName>> = {
  idle: "neutral",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  proud: "proud",
  curious: "curious",
  sorry: "sorry",
  asleep: "asleep",
};

/** Humores en los que hay un trabajo del servidor en curso: parpadea, respira, mira alrededor. */
export function isLiveMood(mood: AssistantMood): boolean {
  return mood === "thinking" || mood === "speaking";
}

/** Humores en los que la mirada sigue al puntero; en el resto la expresión es dueña de los ojos. */
export function gazeAllowed(mood: AssistantMood): boolean {
  return mood === "idle" || mood === "listening" || mood === "curious" || mood === "proud";
}

/** Ocupado, dormido o disculpándose no saluda: el guiño pisaría la expresión. */
export function canGreet(mood: AssistantMood): boolean {
  return !isLiveMood(mood) && mood !== "asleep" && mood !== "sorry";
}

/** Qué gesto corresponde al toque n dentro de la ventana: el tercero es el saludo. */
export function gestureForTap(tapCount: number): AssistantGesture {
  return tapCount >= EASTER_EGG_TAPS ? "wave" : "wink";
}
