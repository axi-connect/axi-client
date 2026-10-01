import type { ReminderDTO } from "./reminder";

/**
 * Los recordatorios de UNA cita, listos para el detalle (lienzo Agenda premium
 * F2, «Axi le recuerda»). El backend lista por contacto; aquí se filtran por
 * `appointment_id` y se cuenta cuánto antes de la cita sale cada uno.
 *
 * Estados honestos (ver `reminder.ts`): programado = activo con `next_run_at`;
 * enviado = one-shot ya corrido; apagado = inactivo sin correr (la cita se
 * canceló o se reagendó y el sistema lo desactivó).
 */
export type AppointmentReminderRow = {
  id: string;
  /** Instante en que sale (o salió). */
  at: string;
  state: "scheduled" | "sent" | "off";
  /** «2 horas antes», «1 día antes», «30 minutos antes». */
  lead: string;
  channelId: string;
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Cuánto antes de `startsAt` sale el recordatorio, en palabras. Lo exacto se
 * dice exacto («1 día», «2 horas», «30 minutos»); lo que no, se redondea a la
 * unidad que se lee («20 horas», nunca «1185 minutos»).
 */
export function leadLabel(atIso: string, startsAtIso: string): string {
  const minutes = Math.round((new Date(startsAtIso).getTime() - new Date(atIso).getTime()) / 60_000);
  if (minutes <= 0) return "a la hora de la cita";
  if (minutes % 1440 === 0 || minutes >= 36 * 60) return `${plural(Math.round(minutes / 1440), "día", "días")} antes`;
  // Hasta 3 h lo no redondo se dice en minutos («90 minutos», no «2 horas»).
  if (minutes >= 60 && (minutes % 60 === 0 || minutes >= 180)) {
    return `${plural(Math.round(minutes / 60), "hora", "horas")} antes`;
  }
  return `${plural(minutes, "minuto", "minutos")} antes`;
}

export function appointmentReminderRows(
  reminders: ReminderDTO[],
  appointment: { id: string; starts_at: string },
): AppointmentReminderRow[] {
  return reminders
    .filter((r) => r.appointment_id === appointment.id)
    .flatMap((r): AppointmentReminderRow[] => {
      const state: AppointmentReminderRow["state"] =
        r.is_active && r.next_run_at !== null
          ? "scheduled"
          : r.schedule_rrule === null && r.last_run_at !== null
            ? "sent"
            : "off";
      const at = state === "sent" ? r.last_run_at : (r.next_run_at ?? r.last_run_at);
      if (at === null) return [];
      return [{ id: r.id, at, state, lead: leadLabel(at, appointment.starts_at), channelId: r.channel_id }];
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}
