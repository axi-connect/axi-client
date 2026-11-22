"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/shared/auth/auth.hooks"
import { BrandLoader } from "@/shared/components/ui/brand-loader"

/**
 * Fallback de navegación dura a /auth/logout (acceso directo/refresh, sin el
 * modal interceptado): cierra la sesión una sola vez y vuelve al inicio.
 *
 * La vuelta es DURA, igual que en el modal: vacía la caché del router y los
 * stores de la sesión cerrada (hotfix 22-nov-2026).
 */
export default function LogoutPage() {
  const { logout } = useAuth()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      await logout()
      window.location.replace("/")
    })()
  }, [logout])

  return <BrandLoader fullScreen label="Cerrando sesión…" />
}
