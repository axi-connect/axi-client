import { addDaysToKey, diffDays, weekStartKey, weekdayOfKey, type DayKey } from "@/core/lib/business-time";
import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialPaceDTO } from "./commercial";
import { formatMillions, formatPct } from "./format";
import { gap, isLearning, ratioPct } from "./pace";
import { isBusinessDay } from "./weeks";

/**
 * Las cifras que acompañan a la línea de la ruta (canvas 1, franja de abajo)
 * y las barras de «Ritmo · esta semana» — módulo PURO. Todo sale del ritmo
 * que manda el servidor: «hoy», los días hábiles y la serie ACUMULADA.
 */

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
/** La inicial del día en las barras: X es miércoles, como en el calendario de aquí. */
const WEEKDAY_LETTER = ["D", "L", "M", "X", "J", "V", "S"] as const;
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10));
}

/** «Hoy · mié 23»: la marca de hoy sobre la línea. */
export function todayMark(today: DayKey): string {
  return `Hoy · ${WEEKDAY_SHORT[weekdayOfKey(today)]} ${String(dayOfMonth(today))}`;
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

export interface RouteFigure {
  key: "missing" | "left" | "expected" | "projection";
  label: string;
  value: string;
  detail: string | null;
}

type FigurePace = Pick<
  CommercialPaceDTO,
  | "currency"
  | "target_revenue_cents"
  | "actual_revenue_cents"
  | "expected_revenue_cents"
  | "projected_revenue_cents"
  | "business_days_left"
  | "period_start"
  | "period_end"
  | "weekdays"
  | "status"
  | "data_sufficiency"
  | "key_results"
>;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * La franja bajo la línea: Faltan · Quedan · A hoy deberías llevar · Si
 * sigues así. En «aprendiendo» solo las dos primeras: sin datos no se afirma
 * dónde deberías ir ni a dónde llegas. La voz es la de siempre: nunca un
 * negativo; «por debajo» o «por encima», jamás «−$ 4,2 M».
 */
export function routeFigures(pace: FigurePace): RouteFigure[] {
  const { currency } = pace;
  const sales = pace.key_results.find((kr) => kr.key === "sales");
  const money = gap(pace.actual_revenue_cents, pace.target_revenue_cents);
  const salesGap = sales === undefined ? null : gap(sales.actual, sales.target);

  const missing: RouteFigure =
    money.missing > 0
      ? {
          key: "missing",
          label: "Faltan",
          value: salesGap === null ? formatMillions(money.missing, currency) : `${formatInteger(salesGap.missing)} ${plural(salesGap.missing, "venta", "ventas")}`,
          detail: salesGap === null ? null : formatMillions(money.missing, currency),
        }
      : {
          key: "missing",
          label: "Por encima de la meta",
          value: formatMillions(money.surplus, currency),
          detail: salesGap === null || salesGap.surplus === 0 ? null : `${formatInteger(salesGap.surplus)} ${plural(salesGap.surplus, "venta", "ventas")} de más`,
        };

  const days = Math.max(0, pace.business_days_left);
  const last = lastBusinessDay(pace.period_start, pace.period_end, pace.weekdays);
  const left: RouteFigure =
    days === 0
      ? { key: "left", label: "Quedan", value: "Hoy", detail: "es el último día hábil" }
      : {
          key: "left",
          label: "Quedan",
          value: `${formatInteger(days)} ${plural(days, "día hábil", "días hábiles")}`,
          detail: last === null ? null : `hasta el ${WEEKDAY_NAMES[weekdayOfKey(last)]} ${String(dayOfMonth(last))}`,
        };

  if (isLearning(pace)) return [missing, left];

  const behind = pace.expected_revenue_cents - pace.actual_revenue_cents;
  const expected: RouteFigure = {
    key: "expected",
    label: "A hoy deberías llevar",
    value: formatMillions(pace.expected_revenue_cents, currency),
    detail:
      behind > 0
        ? `${formatMillions(behind, currency)} por debajo`
        : behind < 0
          ? `${formatMillions(-behind, currency)} por encima`
          : "justo donde deberías",
  };

  const figures = [missing, left, expected];
  if (pace.projected_revenue_cents !== null && pace.target_revenue_cents > 0) {
    figures.push({
      key: "projection",
      label: "Si sigues así",
      value: `≈ ${formatMillions(pace.projected_revenue_cents, currency)}`,
      detail: `${formatPct(ratioPct(pace.projected_revenue_cents, pace.target_revenue_cents))} de la meta`,
    });
  }
  return figures;
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
