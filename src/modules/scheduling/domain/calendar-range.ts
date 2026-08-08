import {
  addDaysToKey,
  addMonthsToKey,
  clampRangeDays,
  instantFromBusiness,
  monthMatrix,
  weekDays,
  type DayKey,
} from "./business-time";

/**
 * Derivación del rango de fetch por vista. `GET /scheduling/appointments`
 * exige `from`/`to` (máx 92 días) y no pagina: el rango ES el paginador.
 */
export type CalendarViewKind = "month" | "week" | "day" | "list";

export const LIST_MAX_DAYS = 92;

export type CalendarRange = {
  /** Instantes UTC para el backend. `toUtc` = fin del último día (exclusivo - 1 ms). */
  fromUtc: string;
  toUtc: string;
  /** Días visibles (pared del negocio) que la vista debe pintar. */
  days: DayKey[];
};

export function rangeForView(
  view: CalendarViewKind,
  anchor: DayKey,
  tz: string,
  listRange: { from: DayKey; to: DayKey },
): CalendarRange {
  let days: DayKey[];
  switch (view) {
    case "month":
      days = monthMatrix(anchor);
      break;
    case "week":
      days = weekDays(anchor);
      break;
    case "day":
      days = [anchor];
      break;
    case "list": {
      const clamped = clampRangeDays(listRange.from, listRange.to, LIST_MAX_DAYS);
      days = [];
      for (let key = clamped.from; key <= clamped.to; key = addDaysToKey(key, 1)) {
        days.push(key);
      }
      break;
    }
  }

  const fromUtc = instantFromBusiness(days[0], "00:00", tz);
  const endExclusive = instantFromBusiness(addDaysToKey(days[days.length - 1], 1), "00:00", tz);
  const toUtc = new Date(new Date(endExclusive).getTime() - 1).toISOString();
  return { fromUtc, toUtc, days };
}

/** ¿El rango ya cargado cubre al pedido? (ISO UTC de igual formato: compara lexicográfico). */
export function rangeCovers(
  loaded: { fromUtc: string; toUtc: string },
  wanted: { fromUtc: string; toUtc: string },
): boolean {
  return loaded.fromUtc <= wanted.fromUtc && loaded.toUtc >= wanted.toUtc;
}

/** Navegación ‹ › según la vista. En lista el rango es manual: no aplica. */
export function stepAnchor(view: CalendarViewKind, anchor: DayKey, delta: 1 | -1): DayKey {
  switch (view) {
    case "month":
      return addMonthsToKey(anchor, delta);
    case "week":
      return addDaysToKey(anchor, delta * 7);
    case "day":
      return addDaysToKey(anchor, delta);
    case "list":
      return anchor;
  }
}
