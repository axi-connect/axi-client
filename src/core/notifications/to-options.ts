import type { SileoOptions } from "sileo"

/**
 * Traducción de un aviso de la app (`useAlert().showAlert`) a las opciones de
 * sileo. Es la ÚNICA pieza que decide cómo se ve un aviso: los 384 llamadores
 * siguen escribiendo `{ tone, title, description }` y no saben que sileo existe.
 *
 * Reglas (DESIGN-SYSTEM §9.4):
 * - La píldora admite ~34 caracteres en una línea. Un título más largo se parte
 *   por «cabeza — cola» o «cabeza: cola»; si no tiene cabeza utilizable (el
 *   mensaje del servidor que devuelve `errorMessage(err)`), la píldora toma el
 *   título del tono y el texto entero baja al cuerpo.
 * - Duración por tono; un `autoCloseMs` explícito del llamador manda.
 * - Con botón no se cierra sola.
 * - Éxito e info comparten la ranura de sileo (el nuevo se transforma sobre el
 *   anterior); error y advertencia llevan id propio y se apilan: nunca se pisan.
 */

export type AlertTone = "success" | "error" | "warning" | "info"

export type AlertAction = { label: string; onClick: () => void }

export type AppAlert = {
  tone: AlertTone
  title: string
  description?: string
  actions?: AlertAction[]
  autoCloseMs?: number
}

/**
 * `id` existe en runtime (sileo 0.1.5 lo lee en `createToast`) pero no está en
 * `SileoOptions`. Sin él todo aviso usa `"sileo-default"` y comparte ranura.
 */
export type NotifyOptions = SileoOptions & { id?: string }

export const PILL_MAX = 34

export const TONE_TITLE: Record<AlertTone, string> = {
  success: "Listo",
  error: "No se pudo completar",
  warning: "Atención",
  info: "Aviso",
}

export const TONE_DURATION_MS: Record<AlertTone, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 8000,
}

const STACKED: ReadonlySet<AlertTone> = new Set(["error", "warning"])

const MIN_DURATION_MS = 1000

/** «Cabeza — cola», «Cabeza – cola», «Cabeza - cola» o «Cabeza: cola». */
const HEAD_TAIL = /^(.{3,34}?)(?:\s[—–-]\s|:\s)(.+)$/

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function join(first: string, second?: string): string {
  if (!second) return first
  return /[.!?…]$/.test(first) ? `${first} ${second}` : `${first}. ${second}`
}

export function splitTitle(
  tone: AlertTone,
  title: string,
  description?: string,
): { title: string; description?: string } {
  const clean = title.trim()
  if (clean.length <= PILL_MAX) return { title: clean, description }

  const match = clean.match(HEAD_TAIL)
  if (match) {
    return { title: match[1], description: join(capitalize(match[2]), description) }
  }
  return { title: TONE_TITLE[tone], description: join(clean, description) }
}

export function toSileoOptions(alert: AppAlert, nextId: () => string): NotifyOptions {
  const { title, description } = splitTitle(alert.tone, alert.title, alert.description)
  const action = alert.actions?.[0]

  const duration = action
    ? null
    : Math.max(MIN_DURATION_MS, alert.autoCloseMs ?? TONE_DURATION_MS[alert.tone])

  return {
    title,
    ...(description ? { description } : {}),
    duration,
    ...(action ? { button: { title: action.label, onClick: action.onClick } } : {}),
    ...(STACKED.has(alert.tone) ? { id: nextId() } : {}),
  }
}
