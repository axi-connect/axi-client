import { parseHttpError } from "@/core/api/problem"
import type { PasswordTokenInfo } from "../../domain/password"

/**
 * Llamadas del navegador al BFF de contraseña (`/api/auth/password/*`).
 *
 * No usan el `HttpClient`: con `authenticate: false` saldría DIRECTO al backend
 * desde el navegador, y el contrato pide que el token se consuma solo por POST
 * al BFF (mismo origen, sin CORS, con la IP del visitante reenviada). `change`
 * además necesita que el BFF reescriba las cookies de sesión. Lanzan
 * `HttpError` (RFC 7807) como el resto del proyecto.
 */
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth/password/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw await parseHttpError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** 202 siempre, exista o no el correo. */
export function requestPasswordReset(email: string): Promise<void> {
  return post<void>("forgot", { email })
}

/** Vigencia del enlace, o `HttpError` 410 `auth/password_token_invalid`. */
export function inspectPasswordToken(token: string): Promise<PasswordTokenInfo> {
  return post<PasswordTokenInfo>("inspect", { token })
}

/** Consume el enlace y fija la contraseña (204). */
export function setPasswordWithToken(token: string, newPassword: string): Promise<void> {
  return post<void>("set", { token, new_password: newPassword })
}

/** Cambia la contraseña con la sesión abierta; el BFF renueva las cookies. */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return post<void>("change", { current_password: currentPassword, new_password: newPassword })
}
