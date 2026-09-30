import type { AppointmentDTO } from "./appointment";

/**
 * Frases del día (lienzo Agenda premium F1), en la voz del progreso: la cifra
 * con lo que sigue, nunca una cifra sola. Puras, sin React.
 */

type Named = { appointment: AppointmentDTO; contactName: string | null; time: string };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** «5 citas · 3 por confirmar» (sin contar las canceladas). */
export function dayHeadingSummary(appointments: AppointmentDTO[]): string {
  const active = appointments.filter((a) => a.status !== "cancelled");
  if (active.length === 0) return "Sin citas";
  const pending = active.filter((a) => a.status === "scheduled").length;
  const base = plural(active.length, "cita", "citas");
  return pending > 0 ? `${base} · ${pending} por confirmar` : base;
}

/**
 * La frase de la cabecera de la Agenda: «Hoy tienes 5 citas; 3 esperan
 * confirmación. La próxima, a las 11:00: Camila Restrepo.». `upcoming` es la
 * siguiente cita activa que aún no empieza, ya con nombre y hora.
 */
export function todaySentence(
  appointments: AppointmentDTO[],
  upcoming: Named | null,
): { lead: string; next: { time: string; name: string } | null } {
  const active = appointments.filter((a) => a.status !== "cancelled");
  if (active.length === 0) {
    return { lead: "Hoy no tienes citas.", next: null };
  }
  const pending = active.filter((a) => a.status === "scheduled").length;
  let lead = `Hoy tienes ${plural(active.length, "cita", "citas")}`;
  lead +=
    pending === 0
      ? "."
      : pending === 1
        ? "; 1 espera confirmación."
        : `; ${pending} esperan confirmación.`;
  if (upcoming === null) {
    return { lead: `${lead} Ya no quedan más por hoy.`, next: null };
  }
  return { lead, next: { time: upcoming.time, name: upcoming.contactName ?? "un contacto" } };
}

/** La próxima cita activa de la lista que empieza después de `now`. */
export function nextUpcoming(appointments: AppointmentDTO[], now: Date): AppointmentDTO | null {
  const nowMs = now.getTime();
  return (
    appointments
      .filter(
        (a) =>
          (a.status === "scheduled" || a.status === "confirmed") &&
          new Date(a.starts_at).getTime() > nowMs,
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null
  );
}
