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
