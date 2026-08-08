/**
 * Builder guiado de recurrencia (RFC 5545 SIN DTSTART, el subset que genera
 * el panel: FREQ diaria/semanal/mensual + BYDAY/BYMONTHDAY + BYHOUR/BYMINUTE).
 * El backend evalúa la regla en el `timezone` del recordatorio y calcula
 * `next_run_at` solo. No hay campo de texto libre: la rrule siempre sale de
 * `buildRrule` (decisión de diseño F0).
 */
export type RecurrenceWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY";

export type RecurrenceConfig = {
  freq: RecurrenceFreq;
  /** WEEKLY: al menos un día. */
  byWeekdays?: RecurrenceWeekday[];
  /** MONTHLY: 1–28 (evita meses cortos). */
  byMonthDay?: number;
  hour: number;
  minute: number;
};

/** Orden visual lunes-primero (la convención BYDAY es independiente del 0=domingo del backend). */
export const RECURRENCE_WEEKDAYS: ReadonlyArray<{ code: RecurrenceWeekday; label: string; long: string }> = [
  { code: "MO", label: "L", long: "los lunes" },
  { code: "TU", label: "M", long: "los martes" },
  { code: "WE", label: "X", long: "los miércoles" },
  { code: "TH", label: "J", long: "los jueves" },
  { code: "FR", label: "V", long: "los viernes" },
  { code: "SA", label: "S", long: "los sábados" },
  { code: "SU", label: "D", long: "los domingos" },
];

export const RECURRENCE_FREQ_LABELS: Record<RecurrenceFreq, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
};

export const MONTH_DAY_MAX = 28;

/** `null` = configuración incompleta (p.ej. WEEKLY sin días): no hay regla que construir. */
export function buildRrule(config: RecurrenceConfig): string | null {
  if (!Number.isInteger(config.hour) || config.hour < 0 || config.hour > 23) return null;
  if (!Number.isInteger(config.minute) || config.minute < 0 || config.minute > 59) return null;

  const parts = [`FREQ=${config.freq}`];
  if (config.freq === "WEEKLY") {
    const days = config.byWeekdays ?? [];
    if (days.length === 0) return null;
    // Orden estable lunes-primero para que el round-trip sea determinista.
    const ordered = RECURRENCE_WEEKDAYS.filter((d) => days.includes(d.code)).map((d) => d.code);
    parts.push(`BYDAY=${ordered.join(",")}`);
  }
  if (config.freq === "MONTHLY") {
    const day = config.byMonthDay ?? 1;
    if (!Number.isInteger(day) || day < 1 || day > MONTH_DAY_MAX) return null;
    parts.push(`BYMONTHDAY=${day}`);
  }
  parts.push(`BYHOUR=${config.hour}`, `BYMINUTE=${config.minute}`);
  return parts.join(";");
}

const WEEKDAY_CODES = new Set(RECURRENCE_WEEKDAYS.map((d) => d.code));

/**
 * Inversa de `buildRrule` para el subset del panel. Una rrule externa o con
 * claves fuera del subset devuelve `null`: el editor muestra la regla cruda
 * y avisa que editarla la reemplaza.
 */
export function parseRrule(rrule: string): RecurrenceConfig | null {
  const entries = new Map<string, string>();
  for (const part of rrule.split(";")) {
    const [key, value] = part.split("=");
    if (!key || value === undefined) return null;
    entries.set(key.toUpperCase(), value);
  }

  const freq = entries.get("FREQ");
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY") return null;

  const known = new Set(["FREQ", "BYDAY", "BYMONTHDAY", "BYHOUR", "BYMINUTE"]);
  for (const key of entries.keys()) {
    if (!known.has(key)) return null;
  }

  const hour = Number(entries.get("BYHOUR"));
  const minute = Number(entries.get("BYMINUTE"));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const config: RecurrenceConfig = { freq, hour, minute };

  if (freq === "WEEKLY") {
    const byday = entries.get("BYDAY");
    if (byday === undefined || byday === "") return null;
    const days = byday.split(",") as RecurrenceWeekday[];
    if (days.some((d) => !WEEKDAY_CODES.has(d))) return null;
    config.byWeekdays = days;
  } else if (entries.has("BYDAY")) {
    return null;
  }

  if (freq === "MONTHLY") {
    const day = Number(entries.get("BYMONTHDAY"));
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    config.byMonthDay = day;
  } else if (entries.has("BYMONTHDAY")) {
    return null;
  }

  return config;
}

function fmtHourMinute(hour: number, minute: number): string {
  const suffix = hour < 12 ? "a. m." : "p. m.";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** "Cada semana, los lunes y miércoles a las 9:00 a. m."; `null` si la regla no es del subset. */
export function describeRrule(rrule: string): string | null {
  const config = parseRrule(rrule);
  if (config === null) return null;
  const time = fmtHourMinute(config.hour, config.minute);
  if (config.freq === "DAILY") return `Todos los días a las ${time}`;
  if (config.freq === "MONTHLY") {
    return `Cada mes, el día ${config.byMonthDay ?? 1} a las ${time}`;
  }
  const labels = RECURRENCE_WEEKDAYS.filter((d) => config.byWeekdays?.includes(d.code)).map(
    (d) => d.long,
  );
  return `Cada semana, ${joinEs(labels)} a las ${time}`;
}
