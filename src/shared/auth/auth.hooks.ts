"use client"

import { useAuthContext } from "../../core/providers/auth-provider"

export function useAuth() {
  return useAuthContext()
}

export function useSession() {
  const { status, user } = useAuthContext()
  return { status, user, isAuthenticated: status === "authenticated" }
}