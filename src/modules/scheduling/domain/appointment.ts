import type { Schemas } from "@/core/api/types";
import { splitAppointmentByDay, type DayKey, type DaySegment } from "@/core/lib/business-time";

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
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

/**
 * Tono de cada estado: el ÚNICO mapa de color de la agenda (lienzo Agenda
 * premium F1). El color vive en el punto, nunca en el texto ni en franjas:
 * el bloque, el chip del mes, la fila de la lista y la píldora del detalle
 * leen de aquí.
 */
export const APPOINTMENT_STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: "bg-info",
  confirmed: "bg-success",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
  no_show: "bg-warning",
};

/** Ya pasó: el bloque se apaga (fondo de página en vez de tarjeta). */
export function isSettledStatus(status: AppointmentStatus): boolean {
  return status === "completed" || status === "no_show";
}

/**
 * Las canceladas no ocupan columna en Semana y Día (decisión D1 del lienzo):
 * solo aparecen en la rejilla si el filtro pide justo «Cancelada».
 */
export function showsInTimeGrid(
  status: AppointmentStatus,
  statusFilter: AppointmentStatus | "all",
): boolean {
  return status !== "cancelled" || statusFilter === "cancelled";
}

/** De dónde viene la cita: decide «Ver llamada», «Ver conversación» o nada. */
export type AppointmentOrigin =
  | { kind: "call"; callSessionId: string }
  | { kind: "conversation"; conversationId: string }
  | { kind: "team" };

export function appointmentOrigin(
  appointment: Pick<AppointmentDTO, "call_session_id" | "conversation_id">,
): AppointmentOrigin {
  // `!= null` a propósito: con un servidor anterior a origen-llamada el campo
  // llega AUSENTE (undefined), y `!== null` pintaba toda cita de chat como
  // «Ver llamada» hacia /calls/undefined. La llamada manda: una cita agendada
  // en voz nunca tiene conversación.
  if (appointment.call_session_id != null) {
    return { kind: "call", callSessionId: appointment.call_session_id };
  }
  if (appointment.conversation_id != null) {
    return { kind: "conversation", conversationId: appointment.conversation_id };
  }
  return { kind: "team" };
}

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
