import type { Schemas } from "@/core/api/types";
import type { DayKey } from "@/core/lib/business-time";

/**
 * Días especiales y cierres de la agenda (S-05, `/scheduling/exceptions` y
 * `/scheduling/closures`). Un día especial es «cerrado» o una o varias
 * franjas que REEMPLAZAN el horario semanal de esa fecha; manda sobre los
 * festivos y sobre el horario de atención, para el panel y para la IA.
 */
export type ScheduleExceptionListDTO = Schemas["ScheduleExceptionListDto"];
export type ScheduleExceptionDTO = ScheduleExceptionListDTO["items"][number];
export type PutScheduleExceptionDTO = Schemas["PutScheduleExceptionDto"];
export type ClosuresDTO = Schemas["ClosuresDto"];
export type ClosureDayDTO = ClosuresDTO["days"][number];

export type TimeWindow = { opens_at: string; closes_at: string };

/**
 * Países con calendario de festivos en el servidor (`HOLIDAY_COUNTRIES` del
 * puerto `HolidayCalendar`). Espejo a propósito: el selector solo ofrece lo
 * que el servidor sabe calcular.
 */
export const HOLIDAY_COUNTRIES: readonly { code: string; name: string }[] = [
  { code: "CO", name: "Colombia" },
];

export function holidayCountryName(code: string | null | undefined): string {
  return HOLIDAY_COUNTRIES.find((country) => country.code === code)?.name ?? "tu país";
}

/** Horas de 15 en 15 minutos, de 00:00 a 23:45 (el menú del campo de hora). */
export const QUARTER_HOURS: readonly string[] = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

/** «2026-10-19» → «19/10/2026», sin depender del idioma del navegador. */
export function fmtDateDmy(key: DayKey | ""): string {
  if (key === "") return "";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

/** Problemas de las franjas, en español; vacío si sirven (el servidor repite la validación). */
export function windowIssues(windows: readonly TimeWindow[]): string[] {
  if (windows.length === 0) return ["Indica al menos una franja"];
  const issues: string[] = [];
  const sorted = [...windows].sort((a, b) => a.opens_at.localeCompare(b.opens_at));
  sorted.forEach((window, index) => {
    if (window.opens_at >= window.closes_at) issues.push("Una franja cierra antes de abrir");
    const next = sorted[index + 1];
    if (next !== undefined && next.opens_at < window.closes_at) {
      issues.push("Dos franjas se cruzan");
    }
  });
  return [...new Set(issues)];
}

/** «10:00–14:00, 15:00–17:00». */
export function windowsLabel(windows: readonly TimeWindow[]): string {
  return windows.map((window) => `${window.opens_at}–${window.closes_at}`).join(", ");
}
