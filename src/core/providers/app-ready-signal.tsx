"use client"

import { useEffect } from "react"
import { useSplashOptional } from "@/core/providers/splash-provider"

/**
 * Señal de "app lista" para el splash post-login: al montar (el layout
 * privado ya renderizó) notifica al SplashProvider para que inicie la salida
 * animada del overlay. No renderiza nada; es un no-op si no hay splash activo.
 */
export function AppReadySignal() {
  const { markReady } = useSplashOptional()

  useEffect(() => {
    markReady()
  }, [markReady])

  return null
}
