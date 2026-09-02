"use client"

import { isPublicPath } from "@/core/config/routes"
import { socketManager } from "@/core/realtime/socket-manager"
import { API_ERROR_CODES, COMPANY_SUSPENDED_EVENT, isSuspensionCode } from "@/core/api/problem"
import { CompanySuspendedScreen } from "@/core/providers/company-suspended-screen"
import type { AuthUser, LoginPayload, SessionResponse, SignupPayload, SignupResult } from "@/shared/auth/auth.types"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

/** `suspended`: la empresa del usuario fue suspendida (F15) — pantalla bloqueante. */
type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "suspended"

/**
 * Error tipado de login propagado desde el BFF (`/api/auth/login`), que a su
 * vez conserva el `code` RFC 7807 del backend. La UI discrimina por `code`
 * (p.ej. `auth/ambiguous_company` → pedir NIT, 429 → cuenta regresiva).
 */
export class LoginError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfterSeconds?: number

  constructor(args: { code: string; status: number; message: string; retryAfterSeconds?: number }) {
    super(args.message)
    this.name = "LoginError"
    this.code = args.code
    this.status = args.status
    this.retryAfterSeconds = args.retryAfterSeconds
  }
}

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  /**
   * Gateo de UI por permiso `resource:action` (con soporte de wildcard
   * `resource:*` y `*:*`). Es UX, no seguridad: el backend valida siempre.
   */
  hasPermission: (permission: string) => boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  /**
   * Alta autoservicio: crea empresa + owner en trial y deja la sesión abierta
   * en el mismo viaje (el BFF siembra las cookies con los tokens que devuelve
   * el backend). Lanza `LoginError` con el `code` del backend, igual que `login`.
   */
  signup: (payload: SignupPayload) => Promise<SignupResult>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function permissionMatches(granted: string, required: string): boolean {
  if (granted === required || granted === "*:*" || granted === "*") return true
  const [grantedResource, grantedAction] = granted.split(":")
  const [requiredResource] = required.split(":")
  return grantedResource === requiredResource && grantedAction === "*"
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  // Code del bloqueo (F15): elige la variante de copy de la pantalla
  // (suspensión genérica vs prueba finalizada)
  const [suspensionCode, setSuspensionCode] = useState<string>(API_ERROR_CODES.companySuspended)

  const redirectToLogin = useCallback(() => {
    const { pathname, search } = window.location

    setUser(null)
    setStatus("unauthenticated")
    if (isPublicPath(pathname)) return
    window.location.href = "/auth/login?next=" + encodeURIComponent(pathname + search)
  }, [])

  /**
   * Corta la sesión ante la suspensión de la empresa (F15): frena el tiempo
   * real (halt síncrono ANTES de que socket.io intente reconectar), muestra la
   * pantalla bloqueante y borra las cookies best-effort (el backend ya revocó
   * los tokens; esto solo limpia el browser). Idempotente: da igual si la
   * señal llega por HTTP, por WS o por ambas.
   */
  const markSuspended = useCallback((code?: string) => {
    socketManager.halt()
    setUser(null)
    setSuspensionCode(code ?? API_ERROR_CODES.companySuspended)
    setStatus("suspended")
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
  }, [])

  useEffect(() => {
    // El detail del CustomEvent lleva el code; un Event plano cae al genérico
    const onSuspended = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      markSuspended(typeof detail === "string" ? detail : undefined)
    }
    window.addEventListener(COMPANY_SUSPENDED_EVENT, onSuspended)
    return () => window.removeEventListener(COMPANY_SUSPENDED_EVENT, onSuspended)
  }, [markSuspended])

  const hydrate = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const json: SessionResponse = await res.json()
      if (json.isAuthenticated && json.user) {
        setUser(json.user)
        setStatus("authenticated")
      } else if (isSuspensionCode(json.code)) {
        // Nunca al login: también respondería 403 (loop de mensajes confusos).
        markSuspended(json.code)
      } else redirectToLogin()
    } catch {
      redirectToLogin()
    }
  }, [redirectToLogin, markSuspended])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const retryAfter = res.headers.get("Retry-After")
      let body: { code?: string; message?: string } = {}
      try {
        body = await res.json()
      } catch {
        // Respuesta sin cuerpo JSON → error genérico.
      }
      throw new LoginError({
        code: body.code ?? `http/${res.status}`,
        status: res.status,
        message: body.message ?? "No se pudo iniciar sesión",
        retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
      })
    }
    // Login exitoso (empresa activa): re-habilita el tiempo real si venía
    // frenado por una suspensión en esta misma sesión de página.
    socketManager.reset()
    await hydrate()
  }, [hydrate])

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const retryAfter = res.headers.get("Retry-After")
        let body: { code?: string; message?: string } = {}
        try {
          body = await res.json()
        } catch {
          // Sin cuerpo JSON → error genérico.
        }
        throw new LoginError({
          code: body.code ?? `http/${res.status}`,
          status: res.status,
          message: body.message ?? "No se pudo crear la cuenta",
          retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
        })
      }
      const result = (await res.json()) as SignupResult
      socketManager.reset()
      await hydrate()
      return result
    },
    [hydrate],
  )

  const refresh = useCallback(async () => {
    await fetch("/api/auth/refresh", { method: "POST" })
    await hydrate()
  }, [hydrate])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setStatus("unauthenticated")
  }, [])

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false
      return user.permissions.some((granted) => permissionMatches(granted, permission))
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, hasPermission, login, signup, refresh, logout }),
    [status, user, hasPermission, login, signup, refresh, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {status === "suspended" ? (
        <CompanySuspendedScreen
          variant={
            suspensionCode === API_ERROR_CODES.trialExpired
              ? "trial_expired"
              : suspensionCode === API_ERROR_CODES.paymentOverdue
                ? "payment_overdue"
                : "suspended"
          }
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider")
  return ctx
}
