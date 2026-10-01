/**
 * Fechas de una ruta dichas como se dicen: «hoy, 8:00», «mañana, 14:00»,
 * «ayer, 10:00», «jue 2 oct, 14:00», en la zona de la ruta.
 */
function dayKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

function hour(date: Date, timeZone: string): string {
  const text = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const [h = "0", m = "00"] = text.split(":");
  return `${String(Number(h))}:${m}`;
}

export function relativeDay(at: Date, now: Date, timeZone: string): string {
  const day = dayKey(at, timeZone);
  if (day === dayKey(now, timeZone)) return "hoy";
  if (day === dayKey(new Date(now.getTime() + 86_400_000), timeZone)) return "mañana";
  if (day === dayKey(new Date(now.getTime() - 86_400_000), timeZone)) return "ayer";
  // Por partes: según la versión de ICU, «es-CO» mete «de» y puntos; aquí siempre «jue 2 oct».
  const parts = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => (parts.find((entry) => entry.type === type)?.value ?? "").replace(".", "");
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

/** «8:00»: la hora de un instante en la zona de la ruta. */
export function hourIn(iso: string, timeZone: string): string | null {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : hour(at, timeZone);
}

/** «hoy, 14:00». */
export function whenLabel(iso: string, timeZone: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${relativeDay(at, now, timeZone)}, ${hour(at, timeZone)}`;
}

/** «Salida de hoy, 8:00» · «Salida del jue 2 oct, 8:00». */
export function departureLabel(iso: string, timeZone: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Salida";
  const day = relativeDay(at, now, timeZone);
  const prefix = day === "hoy" || day === "mañana" || day === "ayer" ? `Salida de ${day}` : `Salida del ${day}`;
  return `${prefix}, ${hour(at, timeZone)}`;
}
