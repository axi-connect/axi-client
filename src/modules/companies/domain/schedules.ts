import { WEEKDAY_LABELS, type ScheduleInput } from "./company";

/** Una fila del editor de horario: weekday 0=domingo … 6=sábado. */
export type DayState = {
  weekday: number;
  enabled: boolean;
  opens_at: string;
  closes_at: string;
};

export const DEFAULT_OPENS_AT = "08:00";
export const DEFAULT_CLOSES_AT = "18:00";

/** Las 7 filas a partir del horario guardado; los días sin fila nacen apagados. */
export function buildDayStates(
  schedules: ReadonlyArray<{ weekday: number; opens_at: string; closes_at: string }>,
): DayState[] {
  return WEEKDAY_LABELS.map((_, weekday) => {
    const existing = schedules.find((s) => s.weekday === weekday);
    return {
      weekday,
      enabled: Boolean(existing),
      opens_at: existing?.opens_at ?? DEFAULT_OPENS_AT,
      closes_at: existing?.closes_at ?? DEFAULT_CLOSES_AT,
    };
  });
}

/** Solo los días encendidos: el backend reemplaza el set completo. */
export function toScheduleInputs(days: ReadonlyArray<DayState>): ScheduleInput[] {
  return days
    .filter((d) => d.enabled)
    .map(({ weekday, opens_at, closes_at }) => ({ weekday, opens_at, closes_at }));
}

/** Nombres de los días encendidos cuya hora de cierre no es posterior a la de apertura. */
export function invalidScheduleDays(days: ReadonlyArray<DayState>): string[] {
  return days
    .filter((d) => d.enabled && d.opens_at >= d.closes_at)
    .map((d) => WEEKDAY_LABELS[d.weekday]);
}
