/**
 * Semanas hábiles del mes (lunes a sábado) para la línea de la ruta y el
 * ritmo de la semana. Fechas como `YYYY-MM-DD` locales: se parsean por
 * componentes para que `new Date("2026-09-01")` no las corra un día en las
 * zonas al oeste de UTC.
 */

export interface WeekTick {
  label: string;
  /** Días hábiles de la semana dentro del periodo. */
  days: number;
  start_pct: number;
  end_pct: number;
  mid_pct: number;
}

export interface Week<T> {
  label: string;
  start: string;
  end: string;
  points: T[];
}

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Sin horario del tenant, hábil = lunes a sábado (regla del plan v1). */
export function isBusinessDay(date: Date): boolean {
  return date.getDay() !== 0;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Días hábiles entre dos fechas locales, ambas incluidas. */
export function businessDaysBetween(startIso: string, endIso: string): number {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  let count = 0;
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (isBusinessDay(cursor)) count += 1;
  }
  return count;
}

/**
 * Las semanas del periodo como tramos de la línea: S1…Sn con su posición en %
 * del total de días hábiles. Una semana nueva empieza cada lunes; la primera
 * puede ser corta (septiembre de 2026 arranca en martes: S1 = 5 días) y la
 * última también (28–30 = 3 días). 26 días en total, que es lo que la línea
 * reparte.
 */
export function weekTicks(startIso: string, endIso: string): WeekTick[] {
  const total = businessDaysBetween(startIso, endIso);
  if (total === 0) return [];
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  const weeks: { days: number }[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (weeks.length === 0 || (cursor.getDay() === 1 && cursor > start)) weeks.push({ days: 0 });
    if (isBusinessDay(cursor)) weeks[weeks.length - 1].days += 1;
  }
  let acc = 0;
  return weeks
    .filter((week) => week.days > 0)
    .map((week, index) => {
      const startPct = (acc / total) * 100;
      acc += week.days;
      const endPct = (acc / total) * 100;
      return {
        label: `S${String(index + 1)}`,
        days: week.days,
        start_pct: startPct,
        end_pct: endPct,
        mid_pct: (startPct + endPct) / 2,
      };
    });
}

/** Lunes de la semana de una fecha (el domingo cierra la semana anterior). */
function mondayOf(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

/**
 * Agrupa una serie diaria por semana (lunes a domingo), en orden. Los puntos
 * llegan con `date` local; el resto del punto es del llamador.
 */
export function groupSeriesByWeek<T extends { date: string }>(points: readonly T[]): Week<T>[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const weeks: Week<T>[] = [];
  for (const point of sorted) {
    const monday = mondayOf(parseLocalDate(point.date));
    const start = toIsoDate(monday);
    const last = weeks[weeks.length - 1];
    if (last === undefined || last.start !== start) {
      weeks.push({ label: `S${String(weeks.length + 1)}`, start, end: toIsoDate(addDays(monday, 6)), points: [point] });
    } else {
      last.points.push(point);
    }
  }
  return weeks;
}

/** La semana que contiene `todayIso`, o `null` si la serie no llega a ella. */
export function weekOf<T extends { date: string }>(weeks: readonly Week<T>[], todayIso: string): Week<T> | null {
  return weeks.find((week) => week.start <= todayIso && todayIso <= week.end) ?? null;
}
