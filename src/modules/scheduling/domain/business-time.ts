import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Tiempo "de pared" del negocio. TODO el módulo de agenda renderiza y captura
 * horas en la zona horaria de la empresa (`company.timezone`), nunca en la del
 * navegador: el operador puede estar en otra zona y las citas del backend son
 * instantes UTC.
 *
 * Excepción sancionada a la regla "domain = TS puro" (architecture.md §3.3.1):
 * `date-fns`/`date-fns-tz` son funciones puras y deterministas — la zona se
 * pasa SIEMPRE explícita, nunca se lee del entorno — exactamente la clase de
 * lógica que la regla protege como testeable sin mocks.
 *
 * Representaciones:
 * - Instante:  ISO UTC del backend (`starts_at`, `ends_at`).
 * - Día:       `DayKey` = "YYYY-MM-DD" en la zona del negocio.
 * - Hora:      minutos desde la medianoche del día de negocio (0–1440).
 */
export type DayKey = string;

export const MINUTES_PER_DAY = 1440;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function keyFromParts(year: number, month: number, day: number): DayKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Mediodía UTC del DayKey: ancla estable para aritmética de calendario pura. */
export function dayKeyToUtcNoon(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDaysToKey(key: DayKey, days: number): DayKey {
  const date = dayKeyToUtcNoon(key);
  date.setUTCDate(date.getUTCDate() + days);
  return keyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Días de diferencia `b - a` (mismo día = 0). */
export function diffDays(a: DayKey, b: DayKey): number {
  const ms = dayKeyToUtcNoon(b).getTime() - dayKeyToUtcNoon(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Día de semana del DayKey con la convención del backend: 0=domingo … 6=sábado. */
export function weekdayOfKey(key: DayKey): number {
  return dayKeyToUtcNoon(key).getUTCDay();
}

// ---------------------------------------------------------------------------
// Instante UTC ↔ pared del negocio
// ---------------------------------------------------------------------------

/** DayKey del instante en la zona del negocio. */
export function businessDayKey(utcIso: string, tz: string): DayKey {
  const zoned = toZonedTime(new Date(utcIso), tz);
  return keyFromParts(zoned.getFullYear(), zoned.getMonth() + 1, zoned.getDate());
}

/** Minutos transcurridos desde la medianoche del día de negocio del instante. */
export function minutesIntoDay(utcIso: string, tz: string): number {
  const zoned = toZonedTime(new Date(utcIso), tz);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Instante UTC (ISO) de una hora de pared del negocio. `hhmm` = "HH:mm". */
export function instantFromBusiness(key: DayKey, hhmm: string, tz: string): string {
  return fromZonedTime(`${key}T${hhmm}:00`, tz).toISOString();
}

/** DayKey de "hoy" en la zona del negocio. `now` se inyecta por testabilidad. */
export function todayKey(now: Date, tz: string): DayKey {
  const zoned = toZonedTime(now, tz);
  return keyFromParts(zoned.getFullYear(), zoned.getMonth() + 1, zoned.getDate());
}

/** "HH:mm" de pared del negocio del instante (para inputs `type="time"`). */
export function hhmmFromInstant(utcIso: string, tz: string): string {
  const minutes = minutesIntoDay(utcIso, tz);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// ---------------------------------------------------------------------------
// Grillas de calendario (semana inicia LUNES; weekday backend 0=domingo)
// ---------------------------------------------------------------------------

/** Lunes de la semana a la que pertenece el día. */
export function weekStartKey(key: DayKey): DayKey {
  const dow = weekdayOfKey(key); // 0=domingo
  const sinceMonday = (dow + 6) % 7;
  return addDaysToKey(key, -sinceMonday);
}

/** Los 7 días (lunes → domingo) de la semana del ancla. */
export function weekDays(anchor: DayKey): DayKey[] {
  const start = weekStartKey(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
}

/**
 * Las 42 celdas (6 semanas × 7 días) del mes del ancla, empezando el lunes de
 * la semana del día 1. Cubre siempre los días adyacentes visibles.
 */
export function monthMatrix(anchor: DayKey): DayKey[] {
  const firstOfMonth = `${anchor.slice(0, 8)}01`;
  const start = weekStartKey(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));
}

/** "YYYY-MM" del DayKey, para saber si una celda pertenece al mes del ancla. */
export function monthOfKey(key: DayKey): string {
  return key.slice(0, 7);
}

/** Suma meses al ancla preservando el día 1 (navegación de la vista Mes). */
export function addMonthsToKey(anchor: DayKey, months: number): DayKey {
  const [y, m] = anchor.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return keyFromParts(year, month, 1);
}

// ---------------------------------------------------------------------------
// Segmentación de citas por día (citas que cruzan medianoche)
// ---------------------------------------------------------------------------

export type DaySegment = {
  dayKey: DayKey;
  startMin: number;
  endMin: number;
  /** El tramo continúa desde el día anterior / hacia el siguiente. */
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Divide una cita en tramos por día de negocio. Una cita que termina
 * exactamente a las 00:00 del día siguiente pertenece por completo al día en
 * que empieza (endMin 1440), sin generar un tramo vacío.
 */
export function splitAppointmentByDay(
  appointment: { starts_at: string; ends_at: string },
  tz: string,
): DaySegment[] {
  const startKey = businessDayKey(appointment.starts_at, tz);
  const startMin = minutesIntoDay(appointment.starts_at, tz);
  let endKey = businessDayKey(appointment.ends_at, tz);
  let endMin = minutesIntoDay(appointment.ends_at, tz);

  if (endMin === 0 && diffDays(startKey, endKey) > 0) {
    endKey = addDaysToKey(endKey, -1);
    endMin = MINUTES_PER_DAY;
  }

  const span = diffDays(startKey, endKey);
  if (span <= 0) {
    return [
      {
        dayKey: startKey,
        startMin,
        endMin: Math.max(endMin, startMin),
        continuesBefore: false,
        continuesAfter: false,
      },
    ];
  }

  const segments: DaySegment[] = [
    { dayKey: startKey, startMin, endMin: MINUTES_PER_DAY, continuesBefore: false, continuesAfter: true },
  ];
  for (let i = 1; i < span; i++) {
    segments.push({
      dayKey: addDaysToKey(startKey, i),
      startMin: 0,
      endMin: MINUTES_PER_DAY,
      continuesBefore: true,
      continuesAfter: true,
    });
  }
  segments.push({ dayKey: endKey, startMin: 0, endMin, continuesBefore: true, continuesAfter: false });
  return segments;
}

// ---------------------------------------------------------------------------
// Rango con tope (la lista no puede pedir más de 92 días al backend)
// ---------------------------------------------------------------------------

export function clampRangeDays(
  from: DayKey,
  to: DayKey,
  maxDays: number,
): { from: DayKey; to: DayKey } {
  if (diffDays(from, to) < 0) return { from, to: from };
  if (diffDays(from, to) >= maxDays) return { from, to: addDaysToKey(from, maxDays - 1) };
  return { from, to };
}

// ---------------------------------------------------------------------------
// Formateo es-CO en la zona del negocio (Intl; sin locales de date-fns)
// ---------------------------------------------------------------------------

const LOCALE = "es-CO";

/** "9:00 a. m." del instante, en la zona del negocio. */
export function fmtTime(utcIso: string, tz: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(new Date(utcIso));
}

/** "9:00 – 9:45 a. m." (o con sufijos ambos si cruzan meridiano). */
export function fmtTimeRange(startIso: string, endIso: string, tz: string): string {
  return `${fmtTime(startIso, tz)} – ${fmtTime(endIso, tz)}`;
}

/** Formatea un DayKey sin depender de zona (el key YA es pared del negocio). */
function fmtDayKey(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: "UTC" }).format(
    dayKeyToUtcNoon(key),
  );
}

/** "sábado, 8 de agosto de 2026". */
export function fmtDayLong(key: DayKey): string {
  return fmtDayKey(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "sáb 8". */
export function fmtDayShort(key: DayKey): string {
  return fmtDayKey(key, { weekday: "short", day: "numeric" });
}

/** "8 ago". */
export function fmtDayMonth(key: DayKey): string {
  return fmtDayKey(key, { day: "numeric", month: "short" });
}

/** "agosto de 2026". */
export function fmtMonthTitle(key: DayKey): string {
  return fmtDayKey(key, { month: "long", year: "numeric" });
}

/** "3 – 9 de agosto de 2026" (título de la vista Semana). */
export function fmtWeekTitle(days: DayKey[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (monthOfKey(first) === monthOfKey(last)) {
    const day = new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: "UTC" });
    return `${day.format(dayKeyToUtcNoon(first))} – ${fmtDayKey(last, { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return `${fmtDayMonth(first)} – ${fmtDayKey(last, { day: "numeric", month: "short", year: "numeric" })}`;
}
