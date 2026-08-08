import type { Schemas } from "@/core/api/types";
import { splitAppointmentByDay, type DayKey, type DaySegment } from "./business-time";

/**
 * Contratos del slice scheduling — entidad Cita (`/scheduling/appointments`).
 *
 * Semántica del backend (docs/scheduling_frontend_kb.md):
 * - `starts_at`/`ends_at` son instantes UTC; el panel SIEMPRE los muestra en
 *   la zona del negocio (`company.timezone`).
 * - El DTO NO embebe nombres: `contact_id`/`product_id` se hidratan client-side.
 * - Cancelar va SIEMPRE por `POST /:id/cancel` (nunca PATCH de status).
 * - PATCH de `starts_at` = reagendar: revalida capacity y regenera recordatorios.
 */
export type AppointmentDTO = Schemas["AppointmentDto"];
export type AppointmentStatus = AppointmentDTO["status"];
export type CreateAppointmentDTO = Schemas["CreateAppointmentDto"];
export type UpdateAppointmentDTO = Schemas["UpdateAppointmentDto"];
export type CancelAppointmentDTO = Schemas["CancelAppointmentDto"];

/** `from`/`to` obligatorios (ISO UTC); rango máx 92 días; orden starts_at asc. */
export type ListAppointmentsParams = {
  from: string;
  to: string;
  status?: AppointmentStatus;
  contact_id?: string;
};

export const APPOINTMENT_MAX_RANGE_DAYS = 92;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

/** Clases del `Badge` por estado (tokens semánticos; destructivo ≠ coral). */
export const APPOINTMENT_STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "border-transparent bg-info/12 text-info",
  confirmed: "border-transparent bg-success/12 text-success",
  completed: "border-transparent bg-secondary text-secondary-foreground",
  cancelled: "border-transparent bg-destructive/10 text-destructive",
  no_show: "border-transparent bg-warning/12 text-warning",
};

/** Estados terminales: sin acciones de transición en la UI. */
export function isTerminalStatus(status: AppointmentStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "no_show";
}

export type AppointmentAction = "confirm" | "complete" | "no_show" | "reschedule" | "cancel";

/**
 * Transiciones que OFRECE la UI (el backend no valida transiciones entre
 * estados: esta es la política del panel). Completar / No asistió solo tienen
 * sentido cuando la cita ya inició (`hasStarted`).
 */
export function allowedTransitions(
  status: AppointmentStatus,
  hasStarted: boolean,
): AppointmentAction[] {
  if (isTerminalStatus(status)) return [];
  const actions: AppointmentAction[] = [];
  if (status === "scheduled") actions.push("confirm");
  if (hasStarted) actions.push("complete", "no_show");
  actions.push("reschedule", "cancel");
  return actions;
}

// ---------------------------------------------------------------------------
// Agrupación para las vistas del calendario (pura; testeable sin React)
// ---------------------------------------------------------------------------

export type AppointmentSegment = {
  appointment: AppointmentDTO;
  segment: DaySegment;
};

/**
 * Reparte las citas en tramos por día de negocio (una cita que cruza
 * medianoche aparece en cada día que toca). Mantiene el orden de entrada
 * (starts_at asc del backend) dentro de cada día.
 */
export function groupSegmentsByDay(
  appointments: AppointmentDTO[],
  tz: string,
): Map<DayKey, AppointmentSegment[]> {
  const byDay = new Map<DayKey, AppointmentSegment[]>();
  for (const appointment of appointments) {
    for (const segment of splitAppointmentByDay(appointment, tz)) {
      const bucket = byDay.get(segment.dayKey);
      if (bucket === undefined) byDay.set(segment.dayKey, [{ appointment, segment }]);
      else bucket.push({ appointment, segment });
    }
  }
  return byDay;
}
