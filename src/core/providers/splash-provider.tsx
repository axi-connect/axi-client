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
import { useReducedMotion } from "framer-motion"
import { cn } from "@/core/lib/utils"
import { BrandMark } from "@/shared/components/ui/brand-mark"

/**
 * Splash de transición hacia la app: overlay de marca a pantalla completa que
 * cubre la navegación (login → app, o CTA del home con sesión activa). El
 * isotipo entra, pulsa mientras la app carga y, cuando la vista destino
 * señala que está lista (`markReady`), "se entra por el ojo de la α": el
 * fondo se retira, el logo escala con origen en su agujero central hasta que
 * este supera el viewport (la app se ve a través de él) y desvanece al final.
 * Vive en el root layout para sobrevivir al swap de layouts public → private.
 *
 * Las animaciones son CSS puras (`splash-in` / `splash-exit` en globals.css):
 * transform/opacity corren en el compositor y el zoom no se congela aunque la
 * hidratación de la página destino bloquee el hilo principal.
 *
 * Con `prefers-reduced-motion` el zoom se sustituye por un crossfade.
 */

type SplashPhase = "idle" | "covering" | "leaving"

type SplashContextType = {
  /** Muestra el overlay. Llamar justo antes de navegar hacia la app. */
  start: () => void
  /** La vista destino está montada: dispara la salida animada del overlay. */
  markReady: () => void
}

const SplashContext = createContext<SplashContextType | null>(null)

/** Si nadie llama a `markReady` en este tiempo, el overlay se autodescarta. */
const SAFETY_TIMEOUT_MS = 8000
/** Visibilidad mínima del overlay: evita que la entrada del logo se corte. */
const MIN_COVER_MS = 700
/** Duración del crossfade de salida con reduced-motion. */
const REDUCED_EXIT_MS = 320

/**
 * Centro del ojo de la α en el viewBox del isotipo (500×500): el anillo coral
 * interior está centrado en ~(222.8, 249.7). Escalar desde ahí produce la
 * ilusión de entrar por el agujero.
 */
const EYE_TRANSFORM_ORIGIN = "44.57% 49.95%"

export function SplashProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<SplashPhase>("idle")

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const reducedRef = useRef(prefersReducedMotion)
  reducedRef.current = prefersReducedMotion

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
    // Con reduced-motion la salida es un crossfade por transición CSS: no hay
    // animationend de `splash-exit`, así que el cierre va por temporizador.
    if (reducedRef.current) {
      timersRef.current.push(setTimeout(() => setPhase("idle"), REDUCED_EXIT_MS + 50))
    }
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
      {phase !== "idle" && (
        <div
          role="status"
          aria-label="Ingresando a Axi Connect"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        >
          {/* Fondo + glow, SEPARADOS del logo: al salir se retiran primero
              para que la app quede visible detrás del isotipo mientras crece. */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-background",
              "animate-fade-in transition-opacity duration-300 ease-out",
              leaving && "opacity-0",
            )}
          >
            <span className="size-64 rounded-full bg-brand-gradient-tri opacity-15 blur-3xl" />
          </div>

          <div
            className={cn(
              leaving
                ? prefersReducedMotion
                  ? "opacity-0 transition-opacity duration-300 ease-out"
                  : "animate-splash-exit"
                : "animate-splash-in",
            )}
            style={{ transformOrigin: EYE_TRANSFORM_ORIGIN }}
            onAnimationEnd={(event) => {
              if (event.animationName === "splash-exit" && phaseRef.current === "leaving") {
                setPhase("idle")
              }
            }}
          >
            <span className={phase === "covering" ? "block animate-brand-pulse" : "block"}>
              <BrandMark className="size-28 md:size-36" />
            </span>
          </div>
        </div>
      )}
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
 * compartidas (login, header público, layout privado) que también renderizan
 * en contextos sin splash (tests, storybook).
 */
export function useSplashOptional(): SplashContextType {
  const ctx = useContext(SplashContext)
  return ctx ?? { start: () => {}, markReady: () => {} }
}
