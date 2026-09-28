import { addDaysToKey, diffDays, weekStartKey, weekdayOfKey, type DayKey } from "@/core/lib/business-time";
import { isBusinessDay } from "./weeks";

/**
 * El último día hábil del mes, los días hábiles en palabras y las barras de
 * «Ritmo · esta semana» — módulo PURO. Todo sale del ritmo
 * que manda el servidor: «hoy», los días hábiles y la serie ACUMULADA.
 */

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
/** La inicial del día en las barras: X es miércoles, como en el calendario de aquí. */
const WEEKDAY_LETTER = ["D", "L", "M", "X", "J", "V", "S"] as const;
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10));
}

/** El último día hábil del periodo (el horario lo dice el servidor); `null` si el periodo no tiene ninguno. */
export function lastBusinessDay(periodStart: DayKey, periodEnd: DayKey, weekdays: readonly number[]): DayKey | null {
  const span = diffDays(periodStart, periodEnd);
  for (let back = 0; back <= span; back += 1) {
    const key = addDaysToKey(periodEnd, -back);
    if (isBusinessDay(key, weekdays)) return key;
  }
  return null;
}

export interface WeekBar {
  date: DayKey;
  /** «L», «M», «X»… */
  letter: string;
  /** Ventas del día; `null` = el día aún no llega. */
  sales: number | null;
  today: boolean;
}

export interface WeekChart {
  bars: WeekBar[];
  /** «21 – 26 sep»: de la primera a la última barra. */
  range: string;
}

/**
 * Las barras de la semana de `today`: una por día HÁBIL de la semana dentro
 * del periodo. La serie es acumulada, así que el día es la diferencia con el
 * punto anterior (0 si no hubo punto: el servidor arrastra el acumulado). Los
 * días que no han llegado van sin cifra. `null` si la semana no tiene días
 * hábiles en el periodo.
 */
export function weekChart(
  series: readonly { date: string; sales: number }[],
  today: DayKey,
  weekdays: readonly number[],
  periodStart: DayKey,
  periodEnd: DayKey,
): WeekChart | null {
  const monday = weekStartKey(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(monday, i)).filter(
    (day) => day >= periodStart && day <= periodEnd && isBusinessDay(day, weekdays),
  );
  if (days.length === 0) return null;
  const sorted = [...series].filter((point) => point.date >= periodStart).sort((a, b) => a.date.localeCompare(b.date));
  const cumulativeAt = (day: DayKey): number => {
    let value = 0;
    for (const point of sorted) {
      if (point.date > day) break;
      value = point.sales;
    }
    return value;
  };
  const bars = days.map((day): WeekBar => {
    const future = day > today;
    return {
      date: day,
      letter: WEEKDAY_LETTER[weekdayOfKey(day)],
      sales: future ? null : Math.max(0, cumulativeAt(day) - cumulativeAt(addDaysToKey(day, -1))),
      today: day === today,
    };
  });
  const first = days[0];
  const last = days[days.length - 1];
  const month = (key: DayKey) => MONTH_ABBR[Number(key.slice(5, 7)) - 1];
  const range =
    first === last
      ? `${String(dayOfMonth(first))} ${month(first)}`
      : month(first) === month(last)
        ? `${String(dayOfMonth(first))} – ${String(dayOfMonth(last))} ${month(last)}`
        : `${String(dayOfMonth(first))} ${month(first)} – ${String(dayOfMonth(last))} ${month(last)}`;
  return { bars, range };
}

/**
 * Los días hábiles dichos en palabras: «de lunes a sábado» si son seguidos,
 * «lunes, miércoles y viernes» si no. `null` sin días.
 */
export function weekdaySpan(weekdays: readonly number[]): string | null {
  const days = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (days.length === 0) return null;
  if (days.length === 1) {
    const name = WEEKDAY_NAMES[days[0]];
    return `solo los ${name.endsWith("s") ? name : `${name}s`}`;
  }
  if (days.length === 7) return "todos los días";
  const order = days.map((d) => (d === 0 ? 7 : d));
  const contiguous = order.every((d, i) => i === 0 || d === order[i - 1] + 1);
  if (contiguous) return `de ${WEEKDAY_NAMES[days[0]]} a ${WEEKDAY_NAMES[days[days.length - 1]]}`;
  const names = days.map((d) => WEEKDAY_NAMES[d]);
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
