import type { LucideIcon } from "lucide-react";

/**
 * Tipos del kit de asistente. Son ESTRUCTURALES a propósito: el DTO de la
 * pregunta de Axel (`CmoQuestionDTO`) y el de Alba (`IntakeQuestion`) tienen la
 * misma forma, y cada slice le pasa el suyo sin adaptar nada. El kit no importa
 * de `modules/` (architecture §3.3 regla 7): lo que necesita saber de un
 * mensaje viaja en estas formas mínimas.
 */

export interface AssistantQuestionOption {
  label: string;
  hint: string | null;
}

export interface AssistantQuestionData {
  question: string;
  options: AssistantQuestionOption[];
  allow_free_text: boolean;
}

/** Un paso del trabajo del servidor mientras el asistente piensa. */
export interface AssistantLiveStep {
  label: string;
  done: boolean;
  ms: number | null;
}

/** Una píldora de arranque: etiqueta corta visible, prompt completo en el `aria-label`. */
export interface AssistantStarter {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

/** Textos de la pregunta con opciones; cada asistente trae los suyos. */
export interface AssistantQuestionLabels {
  /** Eyebrow de la pregunta viva. */
  live: string;
  /** Eyebrow de una pregunta anterior, ya contestada. */
  answered: string;
  /** La salida cuando ninguna opción sirve: enfoca el compositor, no envía. */
  writeInstead: string;
}

/* ---------------------------------------------------------------------------
   La isla viva (plan island_live_plan.md, F1). Lo que la isla puede desplegar
   además de la píldora y del trabajo del turno. La isla nunca enseña dos cosas
   a la vez: el orden lo decide `useIslandQueue` (pregunta > aviso > resumen).
   --------------------------------------------------------------------------- */

/** Brillo de la isla según lo que cuenta. Mismos valores que `AssistantIslandStage`. */
export type AssistantIslandGlow = "ai" | "success" | "warning" | "neutral";

/** Un botón de la isla. El primero de una lista es `contrast`; el resto, `glass`. */
export interface AssistantIslandAction {
  /** Estable entre renders: lo usan las claves y los tests. */
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
}

/** El dato que se confirma, tal como lo pinta la tarjeta del hilo. */
export interface AssistantIslandDatum {
  label: string;
  value: string;
  /** De dónde salió, en palabras de la persona: «Lo vi en hagogi.com». */
  origin: string;
}

/** Una línea del resumen con su punto de tono. */
export interface AssistantIslandHighlight {
  label: string;
  detail: string;
  tone: "up" | "down" | "warn" | "neutral";
}

interface IslandItemBase {
  /** Identidad del ítem: empujar otro con el mismo id lo reemplaza. */
  id: string;
  /** Qué se lee en voz alta con «Escuchar». Sin texto, no hay botón. */
  speech?: string;
}

/** La pregunta viva, cuando su burbuja no está a la vista. No se pliega sola. */
export interface AssistantIslandQuestion extends IslandItemBase {
  kind: "question";
  /** Junto a la firma: «te pregunta». */
  eyebrow: string;
  title: string;
  datum?: AssistantIslandDatum;
  actions: readonly AssistantIslandAction[];
}

/** Algo pasó. Una línea y un botón como mucho (DESIGN-SYSTEM §9.4). */
export interface AssistantIslandNotice extends IslandItemBase {
  kind: "notice";
  glow: AssistantIslandGlow;
  /** ≤ 34 caracteres, como el título de un aviso. */
  title: string;
  body?: string;
  action?: AssistantIslandAction;
  /** Sin botón se pliega sola a este plazo y deja el punto. Por defecto 7 s. */
  autoCloseMs?: number;
}

/** Un resumen corto (el informe del día de Axel). */
export interface AssistantIslandSummary extends IslandItemBase {
  kind: "summary";
  eyebrow: string;
  title: string;
  highlights?: readonly AssistantIslandHighlight[];
  actions: readonly AssistantIslandAction[];
}

export type AssistantIslandItem = AssistantIslandQuestion | AssistantIslandNotice | AssistantIslandSummary;

/** Un chip de la isla mientras trabaja: lo que está leyendo o calculando. */
export interface AssistantActivityChip {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Color del icono: leer (violeta), calcular (ámbar), enviar (azul), hecho (verde). */
  tone: "read" | "calc" | "send" | "done";
  /** El chip del paso en curso se resalta. */
  current: boolean;
}

/** Lo que la isla enseña mientras el micrófono graba. */
export interface AssistantIslandListeningState {
  /** Segundos grabados. */
  seconds: number;
  onStop: () => void;
  onCancel: () => void;
}
