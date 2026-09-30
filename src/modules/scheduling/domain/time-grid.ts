import { dayKeyToUtcNoon, hhmmFromInstant, weekdayOfKey, type DayKey } from "@/core/lib/business-time";

/**
 * Geometría y reglas puras de la rejilla horaria (Semana / Día) y de «tocar un
 * hueco para crear» (lienzo Agenda premium F1). Sin React: testeable aparte.
 */

type Interval = { startMin: number; endMin: number };
type Schedule = { weekday: number; opens_at: string; closes_at: string };

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:mm" con dos dígitos, el formato del formulario de cita. */
export function minutesToHhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Complemento (tramos cerrados) de las franjas abiertas dentro de [0, 1440]. */
export function closedIntervals(open: Interval[]): Interval[] {
  const sorted = [...open].sort((a, b) => a.startMin - b.startMin);
  const closed: Interval[] = [];
  let cursor = 0;
  for (const range of sorted) {
    if (range.startMin > cursor) closed.push({ startMin: cursor, endMin: range.startMin });
    cursor = Math.max(cursor, range.endMin);
  }
  if (cursor < 1440) closed.push({ startMin: cursor, endMin: 1440 });
  return closed;
}

/** Media hora que contiene el desplazamiento vertical `offsetPx` de la columna. */
export function slotAtOffset(offsetPx: number, minutePx: number): number {
  const minutes = Math.floor(offsetPx / minutePx / 30) * 30;
  return Math.min(Math.max(minutes, 0), 1440 - 30);
}

/**
 * ¿La cita de `durationMinutes` que empieza a `minutes` cae entera dentro de
 * una franja abierta de ese día? Sin horario configurado no se avisa nada:
 * ese caso lo cubre el aviso «Configura tu horario».
 */
export function isWithinOpenHours(
  schedules: readonly Schedule[],
  day: DayKey,
  minutes: number,
  durationMinutes = 30,
): boolean {
  if (schedules.length === 0) return true;
  const weekday = weekdayOfKey(day);
  return schedules.some(
    (s) =>
      s.weekday === weekday &&
      minutes >= hhmmToMinutes(s.opens_at) &&
      minutes + durationMinutes <= hhmmToMinutes(s.closes_at),
  );
}

/** Franjas abiertas de ese día, como texto: «8:00 – 18:00». */
export function openHoursLabel(schedules: readonly Schedule[], day: DayKey): string | null {
  const weekday = weekdayOfKey(day);
  const open = schedules
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => hhmmToMinutes(a.opens_at) - hhmmToMinutes(b.opens_at))
    .map((s) => `${Number(s.opens_at.slice(0, 2))}:${s.opens_at.slice(3, 5)} – ${Number(s.closes_at.slice(0, 2))}:${s.closes_at.slice(3, 5)}`);
  return open.length === 0 ? null : open.join(" y ");
}

/** Ruta del modal «Nueva cita» con el día y la hora del hueco tocado. */
export function createAtHref(day: DayKey, minutes: number): string {
  return `/scheduling/calendar/create?date=${day}&time=${minutesToHhmm(minutes)}`;
}

/** Lee `?date=&time=` del modal; ignora valores mal formados. */
export function readCreatePrefill(params: {
  get: (key: string) => string | null;
}): { date: DayKey; time: string } | null {
  const date = params.get("date");
  const time = params.get("time");
  if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (time === null || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return { date, time };
}

/** «GMT−5»: la zona del negocio, en la esquina de la rejilla. */
export function timezoneOffsetLabel(tz: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    return (part ?? "GMT").replace("-", "−");
  } catch {
    return "GMT";
  }
}

/** Nombre corto del día de la semana: «lun», «mié». */
export function weekdayShort(day: DayKey): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" })
    .format(dayKeyToUtcNoon(day))
    .replace(".", "");
}

/** Número del día del mes de un DayKey. */
export function dayNumber(day: DayKey): number {
  return Number(day.slice(8, 10));
}

/**
 * Reloj compacto de 24 h («9:00», «15:30»), el de los bloques, el mes y la
 * lista del lienzo: cabe en un bloque angosto sin «a. m.» repetido.
 */
export function fmtClock(utcIso: string, tz: string): string {
  return hhmmFromInstant(utcIso, tz).replace(/^0(\d)/, "$1");
}

/** «9:00 – 9:45». */
export function fmtClockRange(startIso: string, endIso: string, tz: string): string {
  return `${fmtClock(startIso, tz)} – ${fmtClock(endIso, tz)}`;
}
