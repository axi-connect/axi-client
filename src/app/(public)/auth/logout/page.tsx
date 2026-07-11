"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/shared/auth/auth.hooks"
import { BrandLoader } from "@/shared/components/ui/brand-loader"

/**
 * Fallback de navegación dura a /auth/logout (acceso directo/refresh, sin el
 * modal interceptado): cierra la sesión una sola vez y vuelve al inicio.
 */
export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      await logout()
      router.replace("/")
    })()
  }, [logout, router])

  return <BrandLoader fullScreen label="Cerrando sesión…" />
}
