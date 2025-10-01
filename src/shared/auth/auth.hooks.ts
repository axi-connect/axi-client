"use client"

import { useAuthContext } from "./auth.context"

export function useAuth() {
  return useAuthContext()
}

export function useSession() {
  const { status, user } = useAuthContext()
  return { status, user, isAuthenticated: status === "authenticated" }
}