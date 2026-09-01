import type { Schemas } from "@/core/api/types";
import { formatHour } from "@/modules/cmo/domain/proposal-labels";

/** Política del motor de tareas de agente (`/crm/settings/agent-tasks`). */
export type AgentTaskSettings = Schemas["CrmAgentTaskSettingsDto"];

/**
 * Rangos que acepta el backend. Se declaran aquí para que los inputs los
 * impongan ANTES de enviar: un 422 por escribir 99 en "intentos" es un viaje
 * al servidor que la UI podía haber evitado.
 */
export const AGENT_TASK_LIMITS = {
  daily_cap: { min: 1, max: 5000 },
  quiet_start_hour: { min: 0, max: 23 },
  quiet_end_hour: { min: 0, max: 23 },
  max_attempts: { min: 1, max: 20 },
  max_defer_hours: { min: 1, max: 720 },
} as const;

/**
 * Defaults del backend. Solo como forma de partida si el GET falla — el camino
 * normal es partir SIEMPRE de lo que devuelve el servidor, porque el PUT exige
 * la sección completa y un default equivocado pisaría ajustes reales.
 */
export const DEFAULT_AGENT_TASK_SETTINGS: AgentTaskSettings = {
  enabled: true,
  daily_cap: 200,
  quiet_start_hour: 20,
  quiet_end_hour: 8,
  max_attempts: 8,
  max_defer_hours: 72,
};

export type AgentTaskSettingsErrors = Partial<Record<string, string>>;

function outOfRange(value: number, range: { min: number; max: number }): boolean {
  return !Number.isInteger(value) || value < range.min || value > range.max;
}

/**
 * Validación por campo.
 *
 * **No hay regla de orden entre las dos horas**, y su ausencia es deliberada:
 * cruzar medianoche (20:00→08:00) es el uso principal del horario silencioso,
 * así que exigir `end > start` prohibiría el caso normal.
 */
export function validateAgentTaskSettings(
  settings: AgentTaskSettings,
): AgentTaskSettingsErrors {
  const errors: AgentTaskSettingsErrors = {};
  const l = AGENT_TASK_LIMITS;

  if (outOfRange(settings.daily_cap, l.daily_cap)) {
    errors.daily_cap = `Entre ${String(l.daily_cap.min)} y ${String(l.daily_cap.max)}`;
  }
  if (outOfRange(settings.max_attempts, l.max_attempts)) {
    errors.max_attempts = `Entre ${String(l.max_attempts.min)} y ${String(l.max_attempts.max)}`;
  }
  if (outOfRange(settings.max_defer_hours, l.max_defer_hours)) {
    errors.max_defer_hours = `Entre ${String(l.max_defer_hours.min)} y ${String(l.max_defer_hours.max)} horas`;
  }
  return errors;
}

/**
 * ¿Es `hour` una hora silenciosa? Misma aritmética que el motor
 * (`agent_tasks.processor.ts`), incluido el caso `start === end`.
 */
export function isQuietHour(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export type QuietHoursDescription = {
  /** `false` cuando no hay silencio en absoluto. */
  silent: boolean;
  /** Horas de silencio al día. 0 si no hay. */
  hours: number;
  /** El rango cruza la medianoche. */
  wraps: boolean;
  text: string;
};

/**
 * Traduce el par de horas a una frase, que es lo que evita que un rango
 * legítimo se lea como un error de tecleo.
 *
 * Dos casos que la frase existe para desactivar:
 *
 * 1. **El cruce de medianoche.** "De 8 p.m. a 8 a.m." parece invertido hasta
 *    que se añade "del día siguiente". Esa coletilla es todo lo que hace falta.
 * 2. **`start === end`.** El motor lo trata como SIN silencio
 *    (`if (start === end) return false`), pero el usuario leería "24 horas".
 *    Aquí se dice en voz alta antes de que guarde.
 */
export function describeQuietHours(start: number, end: number): QuietHoursDescription {
  if (start === end) {
    return {
      silent: false,
      hours: 0,
      wraps: false,
      text: "Sin horario silencioso: el agente puede escribir a cualquier hora.",
    };
  }

  const wraps = end < start;
  const hours = wraps ? 24 - start + end : end - start;
  const suffix = wraps ? " del día siguiente" : "";
  const plural = hours === 1 ? "hora" : "horas";

  return {
    silent: true,
    hours,
    wraps,
    text: `De ${formatHour(start)} a ${formatHour(end)}${suffix} — ${String(hours)} ${plural} en silencio.`,
  };
}
