"use client"

import { MotionConfig } from "framer-motion"

/**
 * Config global de framer-motion: con `reducedMotion="user"` toda animación
 * de transform/layout de los componentes `motion.*` se desactiva
 * automáticamente cuando el sistema pide `prefers-reduced-motion`
 * (las de opacidad se conservan como feedback esencial).
 * Complementa la media query de `globals.css` (animaciones CSS).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
