import type { CreateAppointmentDTO, UpdateAppointmentDTO } from "./appointment";
import { instantFromBusiness, type DayKey } from "./business-time";

/**
 * Constructores de payload del formulario de cita (puros, testeables).
 * La fecha/hora del formulario es pared del negocio; el backend recibe UTC.
 * Los opcionales vacíos se OMITEN del payload (no se mandan null/"").
 */
export type AppointmentFormInput = {
  date: DayKey;
  /** "HH:mm" en la zona del negocio (slot elegido u hora libre off-grid). */
  time: string;
  productId?: string;
  /** Ignorado por el backend cuando viaja `product_id`. */
  durationMinutes?: number;
  notes?: string;
};

export function buildCreatePayload(
  contactId: string,
  input: AppointmentFormInput,
  tz: string,
): CreateAppointmentDTO {
  const payload: CreateAppointmentDTO = {
    contact_id: contactId,
    starts_at: instantFromBusiness(input.date, input.time, tz),
  };
  if (input.productId !== undefined && input.productId !== "") {
    payload.product_id = input.productId;
  } else if (input.durationMinutes !== undefined) {
    payload.duration_minutes = input.durationMinutes;
  }
  const notes = input.notes?.trim();
  if (notes !== undefined && notes !== "") payload.notes = notes;
  return payload;
}

/** Reagendar = PATCH de `starts_at` (+ duración si no gobierna un servicio). */
export function buildReschedulePayload(
  input: AppointmentFormInput,
  tz: string,
): UpdateAppointmentDTO {
  const payload: UpdateAppointmentDTO = {
    starts_at: instantFromBusiness(input.date, input.time, tz),
  };
  if (
    (input.productId === undefined || input.productId === "") &&
    input.durationMinutes !== undefined
  ) {
    payload.duration_minutes = input.durationMinutes;
  }
  return payload;
}
