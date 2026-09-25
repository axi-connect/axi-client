/**
 * Formateadores es-CO del kit de bienvenida. Puros y deterministas: no usan
 * `Intl` ni `toLocaleString` a propósito. El kit se pinta en el servidor y en el
 * navegador, y la salida de ICU cambia entre versiones de Node y de navegador
 * (`sept.` frente a `sep`, espacios finos en «a. m.»): una diferencia así rompe
 * la hidratación y el diseño del paquete fija una forma concreta.
 */

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Una fecha civil (sin hora ni zona). */
export type CivilDate = { year: number; month: number; day: number };

/** `YYYY-MM-DD` → fecha civil. Lanza si no es una fecha válida. */
export function parseCivilDate(iso: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) throw new Error(`Fecha inválida: ${iso}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error(`Fecha inválida: ${iso}`);
  }
  return { year, month, day };
}

/** Suma días a una fecha civil (cruza meses y años). Se calcula en UTC: sin horario de verano. */
export function addDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** «29 sep» o, con año, «6 oct 2026». */
export function formatShortDate(date: CivilDate, withYear = false): string {
  const base = `${date.day} ${MONTHS_SHORT[date.month - 1]}`;
  return withYear ? `${base} ${date.year}` : base;
}

/** Día 7 de la prueba: el inicio más siete días. */
export function trialEndDate(startIso: string): CivilDate {
  return addDays(parseCivilDate(startIso), 7);
}

/** «29 sep → 6 oct»: la fila «Tu prueba» de la bienvenida. */
export function trialRange(startIso: string): string {
  const start = parseCivilDate(startIso);
  return `${formatShortDate(start)} → ${formatShortDate(addDays(start, 7))}`;
}

/** Entero con separador de miles es-CO: 1000 → «1.000». */
export function formatInteger(value: number): string {
  const n = Math.round(Number(value));
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Pesos colombianos sin decimales: 150000 → «$ 150.000». */
export function formatCop(value: number): string {
  return `$ ${formatInteger(value)}`;
}

/**
 * Une una lista en español con «o» antes del último: `["Nequi", "PSE", "Tarjeta"]`
 * → «Nequi, PSE o Tarjeta». Es la fila «Pagas con» del plan.
 */
export function joinEs(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} o ${items[items.length - 1]}`;
}

/** `HH:mm` (24 h) → «7:30 a. m.» · «12:00 p. m.» · «12:15 a. m.». */
export function formatClockTime(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return hhmm;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return hhmm;
  const suffix = hours < 12 ? "a. m." : "p. m.";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes} ${suffix}`;
}

/** Tamaño de archivo es-CO con un decimal: 1258291 → «1,2 MB»; 870400 → «850 KB». */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${String(mb).replace(".", ",")} MB`;
}

/** Primer nombre: «Camila Restrepo» → «Camila». */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Teléfono E.164 para leer: un celular colombiano sale «+57 300 482 1937»; lo
 * demás se deja tal cual, porque partirlo mal es peor que no partirlo.
 */
export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("573")) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return e164.trim();
}

/** Enlace de WhatsApp para un número en cualquier formato. */
export function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/** URL del panel para mostrar: sin protocolo ni barra final. */
export function displayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/** URL del panel para enlazar: siempre `https://`. */
export function panelHref(url: string): string {
  return `https://${displayUrl(url)}`;
}

// ─── Instantes (ISO con hora) en una zona ───────────────────────────────────
//
// Las mismas reglas de arriba para fechas con hora: meses de `MONTHS_SHORT`
// (sin punto, «sep» y no «sept»), «a. m.»/«p. m.» con espacios normales y
// nunca un punto doble al cerrar la frase (`endSentence`). De `Intl` solo se
// toman los NÚMEROS de la fecha en la zona pedida, que no varían entre motores.

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type InstantParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

function instantParts(iso: string, timeZone?: string): InstantParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const [year, month, day] = [get("year"), get("month"), get("day")];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour: get("hour") % 24, minute: get("minute"), weekday };
}

/** La fecha civil (`YYYY-MM-DD`) de un instante en la zona pedida. */
export function civilDateIn(iso: string, timeZone?: string): CivilDate | null {
  const p = instantParts(iso, timeZone);
  return p ? { year: p.year, month: p.month, day: p.day } : null;
}

/** «jue 1 oct». Cadena vacía si la fecha no es válida. */
export function formatWeekdayDate(iso: string, timeZone?: string): string {
  const p = instantParts(iso, timeZone);
  return p ? `${WEEKDAYS_SHORT[p.weekday]} ${p.day} ${MONTHS_SHORT[p.month - 1]}` : "";
}

/** «3:40 p. m.». */
export function formatInstantTime(iso: string, timeZone?: string): string {
  const p = instantParts(iso, timeZone);
  return p ? formatClockTime(`${p.hour}:${String(p.minute).padStart(2, "0")}`) : "";
}

/** «jue 1 oct · 3:40 p. m.». */
export function formatInstant(iso: string, timeZone?: string): string {
  const day = formatWeekdayDate(iso, timeZone);
  return day ? `${day} · ${formatInstantTime(iso, timeZone)}` : "";
}

/** «12 sep 2026» (con año) o «12 sep». */
export function formatInstantDate(iso: string, timeZone?: string, withYear = true): string {
  const date = civilDateIn(iso, timeZone);
  return date ? formatShortDate(date, withYear) : "";
}

/** «12 sep 2026, 9:00 a. m.». */
export function formatInstantDateTime(iso: string, timeZone?: string): string {
  const date = formatInstantDate(iso, timeZone);
  return date ? `${date}, ${formatInstantTime(iso, timeZone)}` : "";
}

/** Cierra una frase con punto sin duplicarlo: «… 3:40 p. m.» no gana otro «.». */
export function endSentence(text: string): string {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

/**
 * Días de CALENDARIO que faltan hasta el fin de la prueba, en la zona del
 * tenant: la fecha local del fin menos la fecha local de hoy. Una prueba de 7
 * días que vence el día 7 a las 23:59 da 7 el día 0 y 0 el día 7 («termina
 * hoy»); negativo = ya terminó.
 */
export function calendarDaysUntil(endsAtIso: string, timeZone?: string, now: Date = new Date()): number | null {
  const end = civilDateIn(endsAtIso, timeZone);
  const today = civilDateIn(now.toISOString(), timeZone);
  if (!end || !today) return null;
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((endMs - todayMs) / 86_400_000);
}
