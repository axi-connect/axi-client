/**
 * Enlaces de contraseña (invitación y restablecimiento) y cambio de contraseña.
 * TypeScript puro: sin React ni transporte.
 *
 * Contrato del plan `entrega_bienvenida_plan.md` (F1, «Auth: tokens de
 * contraseña»): los enlaces llegan como `…/auth/crear-contrasena#token=…` y
 * `…/auth/restablecer#token=…`. El token va en el `#` para que el navegador no
 * lo mande nunca al servidor ni en el `Referer`.
 */
import type { Schemas } from "@/core/api/types"
import { endSentence, formatInstant } from "@/modules/welcome-kit/domain/formatters"

/** Política D4: de 12 a 128 caracteres (el copy decía 8; manda la decisión). */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

/** Lo que dice `POST /auth/password/token/inspect` de un enlace vigente. */
export type PasswordTokenInfo = Schemas["PasswordTokenInfoDto"]

export type PasswordPurpose = PasswordTokenInfo["purpose"]

/**
 * `details.reason` del 410 `auth/password_token_invalid`. No está en
 * `schema.d.ts`: los `details` de un problem RFC 7807 no se tipan en OpenAPI.
 */
export type PasswordTokenInvalidReason = "expired" | "consumed" | "revoked"

/** Cuánto vive cada enlace, en palabras (copy-v2 §5: «72 horas», «1 hora»). */
export const TOKEN_LIFETIME_LABEL: Record<PasswordPurpose, string> = {
  invite: "72 horas",
  reset: "1 hora",
}

/** Por qué un enlace ya no sirve, en lo que la pantalla sabe decir. */
export type InvalidLinkReason = "expired" | "used" | "replaced"

/**
 * El servidor responde 410 `auth/password_token_invalid` con
 * `details.reason: 'expired' | 'consumed' | 'revoked'`. «consumed» dice «ya se
 * usó»; «revoked» es que un reenvío lo reemplazó por uno más nuevo (QA H2-6),
 * y «expired» o sin `reason`, «venció», con la salida de pedir otro.
 */
export function invalidLinkReason(details: unknown): InvalidLinkReason {
  const reason =
    typeof details === "object" && details !== null ? (details as { reason?: unknown }).reason : undefined
  if (reason === ("consumed" satisfies PasswordTokenInvalidReason)) return "used"
  if (reason === ("revoked" satisfies PasswordTokenInvalidReason)) return "replaced"
  return "expired"
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

/** Hora de Colombia: la del correo de bienvenida y la del dueño. */
const BOGOTA = "America/Bogota"

/**
 * Fecha y hora de vencimiento es-CO en hora de Colombia: «jue 1 oct · 3:40 p. m.»
 * (formato de `password_link_expires_at`, copy-v2 §5), con el formateador del
 * kit: meses sin punto («sep», nunca «sept»). Cadena vacía si no es válida.
 */
export function formatExpiresAt(iso: string): string {
  return formatInstant(iso, BOGOTA)
}

/** «Este enlace sirve una vez y vence el jue 1 oct · 3:40 p. m.» sin el «..» del final. */
export function expiresSentence(expiresAt: string): string {
  return endSentence(`Este enlace sirve una vez y vence el ${expiresAt}`)
}
