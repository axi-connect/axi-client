import type { Schemas } from "@/core/api/types";

/**
 * Recordatorios (`/scheduling/reminders`). Dos formas:
 * - One-shot: sin `schedule_rrule`, `next_run_at` fijo (los automáticos de
 *   cita son one-shot con `appointment_id` poblado).
 * - Recurrente: `schedule_rrule` RFC 5545 SIN DTSTART, evaluada en `timezone`.
 *
 * Los one-shot se desactivan solos tras disparar: inactivo + `last_run_at`
 * significa "enviado", no "apagado". Un envío puede saltarse (canal caído,
 * ventana de 24 h) sin que la serie se rompa: el copy honesto es
 * "programado para {next_run_at}", nunca "entregado".
 */
export type ReminderDTO = Schemas["ReminderDto"];
export type CreateReminderDTO = Schemas["CreateReminderDto"];
export type UpdateReminderDTO = Schemas["UpdateReminderDto"];

/** `is_active` viaja como string "true"/"false" en el query del listado. */
export type ListRemindersParams = {
  is_active?: boolean;
  contact_id?: string;
};

/** Creado por el sistema al agendar una cita: mensaje no editable, badge "Automático". */
export function isAutomaticReminder(reminder: Pick<ReminderDTO, "appointment_id">): boolean {
  return reminder.appointment_id !== null;
}

export type ReminderState = "active" | "sent" | "off";

export function reminderState(
  reminder: Pick<ReminderDTO, "is_active" | "last_run_at" | "schedule_rrule">,
): ReminderState {
  if (reminder.is_active) return "active";
  // Un one-shot que ya corrió se auto-desactiva: eso es "enviado".
  if (reminder.schedule_rrule === null && reminder.last_run_at !== null) return "sent";
  return "off";
}

export const REMINDER_STATE_LABELS: Record<ReminderState, string> = {
  active: "Activo",
  sent: "Enviado",
  off: "Apagado",
};

export const REMINDER_STATE_BADGE_CLASSES: Record<ReminderState, string> = {
  active: "border-transparent bg-success/12 text-success",
  sent: "border-transparent bg-info/12 text-info",
  off: "border-transparent bg-secondary text-secondary-foreground",
};

export const REMINDER_MESSAGE_MAX = 1000;
