import type { Schemas } from "@/core/api/types";

/**
 * Disponibilidad derivada de horario + settings + citas ocupadas
 * (`GET /scheduling/availability`).
 *
 * - `schedule_configured: false` = la empresa NO tiene franjas de horario →
 *   el empty state correcto es "Configura tu horario de atención", nunca
 *   "sin cupo". Con `true` y `slots: []` sí es "sin disponibilidad".
 * - Los slots ya vienen filtrados por antelación mínima y descuentan las
 *   citas ocupadas contra `slot_capacity`.
 */
export type AvailabilityDTO = Schemas["AvailabilityDto"];
export type AvailabilitySlot = AvailabilityDTO["slots"][number];

/** `date_from` obligatorio ("YYYY-MM-DD" en la zona del negocio); horizonte máx 31 días. */
export type AvailabilityParams = {
  date_from: string;
  date_to?: string;
  /** Servicio del catálogo: fija duración+buffer (ignora `duration_minutes`). */
  product_id?: string;
  duration_minutes?: number;
};

export const AVAILABILITY_MAX_DAYS = 31;
