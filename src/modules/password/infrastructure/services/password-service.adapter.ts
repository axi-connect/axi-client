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

/**
 * Consume el enlace y fija la contraseña. `session: true` = el BFF ya dejó la
 * sesión del dueño abierta y se puede entrar al panel sin pasar por el login.
 */
export async function setPasswordWithToken(token: string, newPassword: string): Promise<{ session: boolean }> {
  const result = await post<{ session?: unknown } | undefined>("set", { token, new_password: newPassword })
  return { session: result?.session === true }
}

/** La ruta privada de inicio (la misma a la que lleva el login). */
export const PANEL_HOME = "/dashboard"

/** Navegación COMPLETA al panel: el AuthProvider hidrata con las cookies nuevas. */
export function enterPanel(): void {
  window.location.assign(PANEL_HOME)
}

/** El login con el aviso de éxito («Tu contraseña quedó creada. Inicia sesión.»). */
export function enterLogin(reason: "creada" | "cambiada"): void {
  window.location.assign(`/auth/login?contrasena=${reason}`)
}

/** Cambia la contraseña con la sesión abierta; el BFF renueva las cookies. */
export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return post<void>("change", { current_password: currentPassword, new_password: newPassword })
}
