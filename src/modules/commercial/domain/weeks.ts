import { addDaysToKey, diffDays, weekStartKey, weekdayOfKey, type DayKey } from "@/core/lib/business-time";

/**
 * Semanas hábiles del mes para la línea de la ruta y el ritmo de la semana.
 *
 * Qué días son hábiles lo dice el SERVIDOR (`pace.weekdays`, del horario del
 * tenant) y qué día es hoy también (`pace.today`, en su zona horaria): aquí no
 * se lee el reloj del navegador ni se fija «lunes a sábado». La aritmética de
 * días es la de `core/lib/business-time` (mediodía UTC: sin saltos de DST).
 */

export interface WeekTick {
  label: string;
  /** Días hábiles de la semana dentro del periodo. */
  days: number;
  start_pct: number;
  end_pct: number;
  mid_pct: number;
}

export function isBusinessDay(key: DayKey, weekdays: readonly number[]): boolean {
  return weekdays.includes(weekdayOfKey(key));
}

function eachDay(startKey: DayKey, endKey: DayKey): DayKey[] {
  const span = diffDays(startKey, endKey);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, i) => addDaysToKey(startKey, i));
}

/**
 * Las semanas del periodo como tramos de la línea: S1…Sn con su posición en %
 * del total de días hábiles. Una semana nueva empieza cada lunes; la primera
 * puede ser corta (septiembre de 2026 arranca en martes: S1 = 5 días con
 * lun–sáb) y la última también (28–30 = 3 días). 26 días en total, que es lo
 * que la línea reparte.
 */
export function weekTicks(startKey: DayKey, endKey: DayKey, weekdays: readonly number[]): WeekTick[] {
  const days = eachDay(startKey, endKey);
  const total = days.filter((day) => isBusinessDay(day, weekdays)).length;
  if (total === 0) return [];
  const weeks: { days: number }[] = [];
  for (const day of days) {
    if (weeks.length === 0 || (weekdayOfKey(day) === 1 && day !== startKey)) weeks.push({ days: 0 });
    if (isBusinessDay(day, weekdays)) weeks[weeks.length - 1].days += 1;
  }
  let acc = 0;
  return weeks
    .filter((week) => week.days > 0)
    .map((week, index) => {
      const startPct = (acc / total) * 100;
      acc += week.days;
      const endPct = (acc / total) * 100;
      return { label: `S${String(index + 1)}`, days: week.days, start_pct: startPct, end_pct: endPct, mid_pct: (startPct + endPct) / 2 };
    });
}

export interface WeekProgress {
  sales: number;
  expected_sales: number;
  /** Días hábiles de la semana ya transcurridos (hoy incluido). */
  business_days: number;
}

/**
 * Lo que la semana de `today` lleva, a partir de una serie ACUMULADA: el
 * último punto hasta hoy menos el último punto anterior al lunes (0 si el mes
 * empezó esta semana). Los días hábiles transcurridos se cuentan desde
 * `max(lunes, period_start)`: septiembre de 2026 arranca en martes y el 2 de
 * septiembre lleva 2 días, no 3 con un lunes de agosto que no es del mes.
 * `null` si la serie no tiene ningún punto de la semana.
 */
export function weekProgress(
  series: readonly { date: string; sales: number; expected_sales: number }[],
  today: DayKey,
  weekdays: readonly number[],
  periodStart: DayKey,
): WeekProgress | null {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const monday = weekStartKey(today);
  const from = monday > periodStart ? monday : periodStart;
  const inWeek = sorted.filter((point) => point.date >= from && point.date <= today);
  if (inWeek.length === 0) return null;
  const last = inWeek[inWeek.length - 1];
  // La base es el último punto del PERIODO anterior al tramo: un punto de otro mes no es base.
  const before = sorted.filter((point) => point.date >= periodStart && point.date < from).pop();
  const base = before ?? { sales: 0, expected_sales: 0 };
  const businessDays = eachDay(from, today).filter((day) => isBusinessDay(day, weekdays)).length;
  return {
    sales: Math.max(0, last.sales - base.sales),
    expected_sales: Math.max(0, last.expected_sales - base.expected_sales),
    business_days: businessDays,
  };
}
