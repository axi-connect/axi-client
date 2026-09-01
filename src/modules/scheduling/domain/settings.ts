import type { Schemas } from "@/core/api/types";

/**
 * Parámetros de agenda (`/scheduling/settings`).
 *
 * El GET devuelve la vista RESUELTA (defaults del sistema aplicados). El PUT
 * es de SECCIÓN COMPLETA: lo omitido vuelve al default del sistema — el
 * formulario debe enviar SIEMPRE los 5 campos (F3).
 */
export type SchedulingSettingsDTO = Schemas["SchedulingSettingsDto"];
export type UpdateSchedulingSettingsDTO = Schemas["UpdateSchedulingSettingsDto"];

/** Límites del backend, espejados para validar en cliente. */
export const SETTINGS_LIMITS = {
  slot_capacity: { min: 1, max: 50 },
  default_duration_minutes: { min: 5, max: 480 },
  default_buffer_minutes: { min: 0, max: 120 },
  min_notice_minutes: { min: 0, max: 10_080 }, // 7 días
  reminder_offsets_minutes: { min: 1, max: 40_320, maxItems: 6 }, // 28 días
} as const;

export type TimeUnit = "minutes" | "hours" | "days";

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  minutes: "minutos",
  hours: "horas",
  days: "días",
};

export function unitToMinutes(value: number, unit: TimeUnit): number {
  if (unit === "days") return value * 1440;
  if (unit === "hours") return value * 60;
  return value;
}

/** Descompone minutos en la unidad más legible (días > horas > minutos). */
export function splitMinutes(minutes: number): { value: number; unit: TimeUnit } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

/** "2 días antes" / "3 h antes" / "45 min antes" (chips de offsets). */
export function offsetLabel(minutes: number): string {
  const { value, unit } = splitMinutes(minutes);
  if (unit === "days") return `${value} ${value === 1 ? "día" : "días"} antes`;
  if (unit === "hours") return `${value} h antes`;
  return `${value} min antes`;
}

/** Offsets normalizados: sin duplicados, orden descendente (el más lejano primero). */
export function normalizeOffsets(offsets: number[]): number[] {
  return [...new Set(offsets)].sort((a, b) => b - a);
}

/**
 * Payload del PUT — SIEMPRE los 5 campos: el PUT es de sección completa y lo
 * omitido vuelve al default del sistema (riesgo real de resetear sin querer).
 */
export function buildSettingsPayload(values: {
  slot_capacity: number;
  default_duration_minutes: number;
  default_buffer_minutes: number;
  min_notice_minutes: number;
  reminder_offsets_minutes: number[];
  /** calls F3: canal del recordatorio (whatsapp | call | both). */
  reminder_channel: SchedulingSettingsDTO["reminder_channel"];
}): SchedulingSettingsDTO {
  return {
    slot_capacity: values.slot_capacity,
    default_duration_minutes: values.default_duration_minutes,
    default_buffer_minutes: values.default_buffer_minutes,
    min_notice_minutes: values.min_notice_minutes,
    reminder_offsets_minutes: normalizeOffsets(values.reminder_offsets_minutes),
    reminder_channel: values.reminder_channel,
  };
}
