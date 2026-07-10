"use client"

import {
  useRef,
  useState,
  useContext,
  useCallback,
  createContext,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { BrandMark } from "@/shared/components/ui/brand-mark"
import { splash as splashMotion, spring } from "@/core/styles/motion"

/**
 * Splash de transición post-login: overlay de marca a pantalla completa que
 * cubre la navegación login → app. El isotipo entra, pulsa mientras la app
 * carga y, cuando la vista destino señala que está lista (`markReady`), sale
 * escalando hacia la cámara ("atraviesa la pantalla"). Vive en el root layout
 * para sobrevivir al swap de layouts (public → private).
 *
 * Con `prefers-reduced-motion` el zoom se sustituye por un crossfade.
 */

type SplashPhase = "idle" | "covering" | "leaving"

type SplashContextType = {
  /** Muestra el overlay. Llamar tras un login exitoso, antes de navegar. */
  start: () => void
  /** La vista destino está montada: dispara la salida animada del overlay. */
  markReady: () => void
}

const SplashContext = createContext<SplashContextType | null>(null)

/** Si nadie llama a `markReady` en este tiempo, el overlay se autodescarta. */
const SAFETY_TIMEOUT_MS = 8000
/** Visibilidad mínima del overlay: evita que la entrada del logo se corte. */
const MIN_COVER_MS = 700

export function SplashProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<SplashPhase>("idle")

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const coveredAtRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const leave = useCallback(() => {
    if (phaseRef.current !== "covering") return
    clearTimers()
    // La navegación no llegó a la app (login fallido/abortado): se descarta
    // sin animación de salida para no "atravesar" hacia la misma pantalla.
    if (pathnameRef.current?.startsWith("/auth")) {
      setPhase("idle")
      return
    }
    setPhase("leaving")
  }, [])

  const start = useCallback(() => {
    if (phaseRef.current !== "idle") return
    clearTimers()
    coveredAtRef.current = Date.now()
    setPhase("covering")
    timersRef.current.push(setTimeout(leave, SAFETY_TIMEOUT_MS))
  }, [leave])

  const markReady = useCallback(() => {
    if (phaseRef.current !== "covering") return
    const elapsed = Date.now() - coveredAtRef.current
    const wait = Math.max(0, MIN_COVER_MS - elapsed)
    timersRef.current.push(setTimeout(leave, wait))
  }, [leave])

  const leaving = phase === "leaving"

  return (
    <SplashContext.Provider value={{ start, markReady }}>
      {children}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            key="login-splash"
            role="status"
            aria-label="Ingresando a Axi Connect"
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
            style={{ perspective: 1200 }}
            initial={{ opacity: 0 }}
            animate={{
              // El fondo se desvanece mientras el logo aún vuela hacia la
              // cámara: la app se revela detrás y se completa la ilusión.
              opacity: leaving ? 0 : 1,
              transition: leaving
                ? { delay: 0.35, ...splashMotion.reveal }
                : splashMotion.reveal,
            }}
            exit={{ opacity: 0, transition: splashMotion.reveal }}
          >
            {/* Glow tricolor de marca detrás del isotipo */}
            <span
              aria-hidden="true"
              className="absolute size-64 rounded-full bg-brand-gradient-tri opacity-15 blur-3xl"
            />
            <motion.div
              className="will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={
                leaving
                  ? prefersReducedMotion
                    ? { opacity: 0, transition: splashMotion.reveal }
                    : {
                        scale: 18,
                        opacity: 0,
                        filter: "blur(10px)",
                        transition: splashMotion.exit,
                      }
                  : { opacity: 1, scale: 1, transition: spring.soft }
              }
              onAnimationComplete={() => {
                if (phaseRef.current === "leaving") setPhase("idle")
              }}
            >
              <span className={phase === "covering" ? "block animate-brand-pulse" : "block"}>
                <BrandMark className="size-28 md:size-36" />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SplashContext.Provider>
  )
}

export function useSplash(): SplashContextType {
  const ctx = useContext(SplashContext)
  if (!ctx) throw new Error("useSplash debe usarse dentro de <SplashProvider>")
  return ctx
}

/**
 * Variante tolerante: fuera del provider devuelve no-ops. La usan piezas
 * compartidas (login, layout privado) que también renderizan en contextos
 * sin splash (tests, storybook).
 */
export function useSplashOptional(): SplashContextType {
  const ctx = useContext(SplashContext)
  return ctx ?? { start: () => {}, markReady: () => {} }
}
