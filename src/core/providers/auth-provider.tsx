"use client"

import { isPublicPath } from "@/core/config/routes"
import type { AuthUser, LoginPayload, SessionResponse } from "@/shared/auth/auth.types"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

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

  const redirectToLogin = useCallback(() => {
    const { pathname, search } = window.location

    setUser(null)
    setStatus("unauthenticated")
    if (isPublicPath(pathname)) return
    window.location.href = "/auth/login?next=" + encodeURIComponent(pathname + search)
  }, [])

  const hydrate = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const json: SessionResponse = await res.json()
      if (json.isAuthenticated && json.user) {
        setUser(json.user)
        setStatus("authenticated")
      } else redirectToLogin()
    } catch {
      redirectToLogin()
    }
  }, [redirectToLogin])

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
    await hydrate()
  }, [hydrate])

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
    () => ({ status, user, hasPermission, login, refresh, logout }),
    [status, user, hasPermission, login, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider")
  return ctx
}
