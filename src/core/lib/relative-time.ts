/**
 * Tiempo relativo en español para timestamps de UI (notificaciones, actividad).
 * `numeric: "auto"` produce formas naturales ("ahora", "ayer", "hace 3 min");
 * pasado ~un mes cae a fecha absoluta corta (el relativo pierde precisión útil).
 */
const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto", style: "short" });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 5, unit: "week" },
];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  let delta = (date.getTime() - now.getTime()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(delta) < division.amount) {
      return rtf.format(Math.round(delta), division.unit);
    }
    delta /= division.amount;
  }

  return date.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
