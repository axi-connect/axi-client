/**
 * Fechas «estilo mensajería» para el inbox: la etiqueta corta de la lista
 * (WhatsApp: hora hoy, «Ayer», día de la semana, `dd/mm/aa`), la etiqueta del
 * separador de día del hilo y la hora de la burbuja. Todo compara por DÍA
 * CALENDARIO LOCAL, no por 24 h: un mensaje de anoche a las 23:50 es «Ayer»
 * aunque hayan pasado veinte minutos.
 *
 * Locale fijo `es-CO` (el de `format.ts`), solo `Intl`: sin date-fns aquí.
 */
const LOCALE = "es-CO"
const DAY_MS = 86_400_000
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

function toDate(input: string | number | Date): Date {
  if (input instanceof Date) return input
  if (typeof input === "number") return new Date(input)
  const match = DAY_KEY.exec(input)
  // Una clave de día se interpreta como medianoche LOCAL (new Date("YYYY-MM-DD")
  // sería UTC y correría el día en Colombia).
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Date(input)
}

function isValid(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Días calendario entre `date` y `now` (positivo = pasado). */
function dayDiff(date: Date, now: Date): number {
  return Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / DAY_MS)
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** `YYYY-MM-DD` del día LOCAL de un instante. Clave estable para agrupar. */
export function localDayKey(input: string | Date): string {
  const date = toDate(input)
  if (!isValid(date)) return ""
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${String(date.getFullYear())}-${month}-${day}`
}

/** `14:32` (24 h). */
export function formatClockTime(iso: string): string {
  const date = toDate(iso)
  if (!isValid(date)) return ""
  return date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
}

/**
 * Etiqueta de la FILA de la lista (patrón WhatsApp):
 * hoy → `14:32` · ayer → `Ayer` · <7 días → `Lunes` · resto → `08/09/26`.
 * Un instante futuro (reloj desfasado) se trata como hoy.
 */
export function formatConversationTime(iso: string, now: number | Date = Date.now()): string {
  const date = toDate(iso)
  if (!isValid(date)) return ""
  const diff = dayDiff(date, toDate(now))
  if (diff <= 0) return formatClockTime(iso)
  if (diff === 1) return "Ayer"
  if (diff < 7) return capitalize(date.toLocaleDateString(LOCALE, { weekday: "long" }))
  return date.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/**
 * Etiqueta de un DÍA (separador del hilo, grupos de adjuntos). Acepta la clave
 * `YYYY-MM-DD` o un ISO completo.
 * `long`: `Hoy` · `Ayer` · `Lunes 7 de septiembre` · `10 de marzo de 2026` (otro año).
 * `short`: `Hoy` · `Ayer` · `7 sept` · `10 mar 2026`.
 */
export function formatDayLabel(
  dayKeyOrIso: string,
  now: number | Date = Date.now(),
  style: "long" | "short" = "long",
): string {
  const date = toDate(dayKeyOrIso)
  if (!isValid(date)) return ""
  const today = toDate(now)
  const diff = dayDiff(date, today)
  if (diff <= 0) return "Hoy"
  if (diff === 1) return "Ayer"
  const sameYear = date.getFullYear() === today.getFullYear()
  if (style === "short") {
    return date.toLocaleDateString(LOCALE, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    })
  }
  if (!sameYear) {
    return date.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" })
  }
  // Intl produce «lunes, 7 de septiembre»: sin coma y con mayúscula inicial.
  return capitalize(
    date.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" }).replace(",", ""),
  )
}

/** `jueves, 10 de septiembre de 2026, 14:32` — el `title` de cualquier `<time>`. */
export function formatFullDateTime(iso: string): string {
  const date = toDate(iso)
  if (!isValid(date)) return ""
  // Opciones explícitas y no `timeStyle: "short"`: ese preset da 12 h («2:32 p. m.»)
  // en es-CO y el inbox habla en 24 h en todas partes.
  return date.toLocaleString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
}

/** Tiempo transcurrido compacto: `ahora` · `12 min` · `2 h` · `3 d`. */
export function elapsedShort(iso: string, now: number | Date = Date.now()): string {
  const date = toDate(iso)
  if (!isValid(date)) return ""
  const minutes = Math.max(0, Math.floor((toDate(now).getTime() - date.getTime()) / 60_000))
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `${String(minutes)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)} h`
  return `${String(Math.floor(hours / 24))} d`
}

/**
 * `YYYY-MM-DD` (día local del usuario) → ISO UTC de su medianoche local.
 * `plusDays: 1` da el límite EXCLUSIVO de un rango (`to`) que incluye ese día.
 * Devuelve `undefined` si la cadena no es un día.
 */
export function localDateToIso(yyyyMmDd: string, options: { plusDays?: number } = {}): string | undefined {
  const match = DAY_KEY.exec(yyyyMmDd)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + (options.plusDays ?? 0))
  return isValid(date) ? date.toISOString() : undefined
}
