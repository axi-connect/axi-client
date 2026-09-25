/**
 * Fechas de la consola de plataforma con el formateador es-CO del kit
 * (`welcome-kit/domain/formatters`): meses sin punto («sep», nunca «sept»),
 * «a. m.» con espacios normales y la misma salida en cualquier navegador.
 * Mismos nombres que `core/lib/format`, para cambiar solo el import (QA-5).
 */
import {
  formatInstant,
  formatInstantDate,
  formatInstantDateTime,
  formatInstantTime,
  formatWeekdayDate,
} from "@/modules/welcome-kit/domain/formatters";

/** «12 sep 2026». */
export function formatShortDate(iso: string, timeZone?: string): string {
  return formatInstantDate(iso, timeZone);
}

/** «jue 18 sep · 9:00 a. m.» en la zona pedida (la del negocio). */
export function formatDayTime(iso: string, timeZone?: string): string {
  return formatInstant(iso, timeZone);
}

/** «10 jul 2026, 9:00 a. m.». */
export function formatShortDateTime(iso: string, timeZone?: string): string {
  return formatInstantDateTime(iso, timeZone);
}

/** «jue 1 oct». */
export function formatDayMonth(iso: string, timeZone?: string): string {
  return formatWeekdayDate(iso, timeZone);
}

/** «11:59 p. m.». */
export function formatTime(iso: string, timeZone?: string): string {
  return formatInstantTime(iso, timeZone);
}
