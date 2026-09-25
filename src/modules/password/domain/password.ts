/**
 * Enlaces de contraseña (invitación y restablecimiento) y cambio de contraseña.
 * TypeScript puro: sin React ni transporte.
 *
 * Contrato del plan `entrega_bienvenida_plan.md` (F1, «Auth: tokens de
 * contraseña»): los enlaces llegan como `…/auth/crear-contrasena#token=…` y
 * `…/auth/restablecer#token=…`. El token va en el `#` para que el navegador no
 * lo mande nunca al servidor ni en el `Referer`.
 */

/** Política D4: de 12 a 128 caracteres (el copy decía 8; manda la decisión). */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export type PasswordPurpose = "invite" | "reset"

/**
 * TEMPORAL hasta schema.d.ts — sustituir por el DTO de
 * `POST /auth/password/token/inspect`. `business_name` NO está en el contrato:
 * si el servidor lo añade, el título de «Crea tu contraseña» lo usa; si no, la
 * frase sale sin él.
 */
export type PasswordTokenInfo = {
  purpose: PasswordPurpose
  email_masked: string
  expires_at: string
  business_name?: string | null
}

/** Cuánto vive cada enlace, en palabras (copy-v2 §5: «72 horas», «1 hora»). */
export const TOKEN_LIFETIME_LABEL: Record<PasswordPurpose, string> = {
  invite: "72 horas",
  reset: "1 hora",
}

/** Por qué un enlace ya no sirve, en lo que la pantalla sabe decir. */
export type InvalidLinkReason = "expired" | "used"

/**
 * El servidor responde 410 `auth/password_token_invalid` con un solo código
 * para vencido, usado o revocado (no revela más). Si trae `details.reason`
 * («consumed»/«used»), la pantalla dice «ya se usó»; en cualquier otro caso
 * dice «venció», que es el que ofrece la salida útil: pedir un enlace nuevo.
 */
export function invalidLinkReason(details: unknown): InvalidLinkReason {
  const reason =
    typeof details === "object" && details !== null ? (details as { reason?: unknown }).reason : undefined
  return reason === "consumed" || reason === "used" ? "used" : "expired"
}

/**
 * Lee el token del fragmento (`#token=abc` o `token=abc&x=1`). Devuelve null si
 * no hay o si no tiene la forma de un token (base64url, sin espacios).
 */
export function readTokenFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw) return null
  const token = new URLSearchParams(raw).get("token")
  if (!token) return null
  return /^[A-Za-z0-9_.~-]{16,512}$/.test(token) ? token : null
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
/** Colombia no tiene horario de verano: UTC−5 todo el año. */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000

/**
 * Fecha y hora de vencimiento es-CO en hora de Colombia: «jue 1 oct · 3:40 p. m.»
 * (formato de `password_link_expires_at`, copy-v2 §5). Sin `Intl`: la salida de
 * ICU cambia entre entornos. Devuelve cadena vacía si la fecha no es válida.
 */
export function formatExpiresAt(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  const d = new Date(ms + BOGOTA_OFFSET_MS)
  const hours = d.getUTCHours()
  const minutes = String(d.getUTCMinutes()).padStart(2, "0")
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  const suffix = hours < 12 ? "a. m." : "p. m."
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${h12}:${minutes} ${suffix}`
}
