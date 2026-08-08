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
