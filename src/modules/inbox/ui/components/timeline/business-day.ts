import { businessDayKey, dayKeyToUtcNoon, diffDays, todayKey, type DayKey } from "@/core/lib/business-time"

/**
 * Los días del hilo en la ZONA DEL NEGOCIO (plan §8): el mismo corte con el que
 * el servidor cuenta «hoy». Una persona que atiende desde otra zona ve «Hoy»
 * cuando es hoy para el negocio.
 */
export function businessTimeZone(companyTimeZone: string | null | undefined): string {
  return companyTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Clave del día de negocio de un instante; `""` si la fecha no es válida. */
export function dayKeyIn(tz: string): (iso: string) => DayKey {
  return (iso) => (Number.isNaN(Date.parse(iso)) ? "" : businessDayKey(iso, tz))
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** «Hoy» · «Ayer» · «Lunes 7 de septiembre» · «10 de marzo de 2025» (otro año). */
export function businessDayLabel(key: DayKey, now: number, tz: string): string {
  if (key === "" || key === "unknown") return ""
  const today = todayKey(new Date(now), tz)
  const diff = diffDays(key, today)
  if (diff <= 0) return "Hoy"
  if (diff === 1) return "Ayer"
  const date = dayKeyToUtcNoon(key)
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  if (!sameYear) return date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  return capitalize(date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", ""))
}
