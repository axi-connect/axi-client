"use client"

import { isPublicPath } from "@/core/config/routes"
import type { AuthUser, LoginPayload, SessionResponse } from "../../shared/auth/auth.types"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  logout: () => Promise<void>
  refresh: () => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")

  const redirectToLogin = useCallback(() => {
    const { pathname, search } = window.location;
    if (isPublicPath(pathname)) return;

    setUser(null)
    setStatus("unauthenticated")
    if (pathname === "/auth/login") return
    window.location.href = "/auth/login?next=" + encodeURIComponent(pathname + "?" + search);
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
    hydrate()
  }, [hydrate])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error("Credenciales inválidas")
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

  const value = useMemo<AuthContextValue>(() => ({ status, user, login, refresh, logout }), [status, user, login, refresh, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider")
  return ctx
}