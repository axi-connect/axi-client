/**
 * Las citas del recorrido como .ics para el calendario del ASESOR (la ficha y
 * «Bienvenida enviada»). El dueño recibe las suyas en el correo, generadas por
 * el servidor; esto es solo para quien lo acompaña.
 *
 * RFC 5545 mínimo: VCALENDAR + un VEVENT por cita, horas en UTC, líneas CRLF y
 * el texto escapado (`\`, `;`, `,` y saltos de línea).
 */

export type CalendarEvent = {
  /** Estable por cita: reimportar actualiza en vez de duplicar. */
  uid: string;
  title: string;
  startsAt: string;
  minutes: number;
  description?: string;
};

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function buildIcs(events: readonly CalendarEvent[], now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Axi Connect//Consola de plataforma//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const event of events) {
    const end = new Date(new Date(event.startsAt).getTime() + event.minutes * 60_000).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${icsDate(now.toISOString())}`,
      `DTSTART:${icsDate(event.startsAt)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
