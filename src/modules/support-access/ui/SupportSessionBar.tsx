"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LifeBuoy, LoaderCircle, LogOut } from "lucide-react"

import { API_ERROR_CODES, SUPPORT_ENDED_PATH, SUPPORT_SESSION_EVENT } from "@/core/api/problem"
import { useAlert } from "@/core/providers/alert-provider"
import { socketManager } from "@/core/realtime/socket-manager"
import { useSession } from "@/shared/auth/auth.hooks"
import { minutesLeft, SUPPORT_FORBIDDEN_COPY, SUPPORT_READONLY_COPY } from "../domain/support-access"
import { endSupportSession } from "../infrastructure/support-access.service"

const TICK_MS = 15_000


/**
 * Barra fina del admin en la pestaña de soporte: «Soporte · {negocio} · quedan
 * N min · Salir». Solo existe si `MeDto.support_session` viene, y eso solo pasa
 * bajo la cookie de soporte: la sesión normal del cliente no lo trae, así que
 * el dueño y su equipo nunca la ven.
 *
 * Escucha las señales de soporte que despachan el `HttpClient` y el tiempo
 * real: una acción bloqueada (toast «No disponible en soporte»), la cuenta
 * suspendida (solo lectura) y la sesión terminada (a `/auth/soporte?fin=1`).
 */
export function SupportSessionBar() {
  const { user } = useSession()
  const session = user?.support_session ?? null
  const { showAlert } = useAlert()
  const [now, setNow] = useState(() => Date.now())
  const [leaving, setLeaving] = useState(false)
  const [readonlySignal, setReadonlySignal] = useState(false)

  const leave = useCallback(async () => {
    setLeaving(true)
    await endSupportSession()
    // La pestaña la abrió la consola con `window.open`: se puede cerrar. Si el
    // navegador no deja, queda la despedida.
    window.close()
    window.location.replace(SUPPORT_ENDED_PATH)
  }, [])

  useEffect(() => {
    if (!session) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [session])

  useEffect(() => {
    if (!session) return
    function onSignal(event: Event) {
      const code = (event as CustomEvent<unknown>).detail
      if (code === API_ERROR_CODES.supportActionForbidden) {
        showAlert({ tone: "warning", ...SUPPORT_FORBIDDEN_COPY, autoCloseMs: 6000 })
      } else if (code === API_ERROR_CODES.supportReadonlySuspended) {
        setReadonlySignal(true)
      } else if (code === API_ERROR_CODES.supportSessionEnded) {
        window.location.replace(SUPPORT_ENDED_PATH)
      }
    }
    window.addEventListener(SUPPORT_SESSION_EVENT, onSignal)
    return () => window.removeEventListener(SUPPORT_SESSION_EVENT, onSignal)
  }, [session, showAlert])

  // Solo lectura (N7): lo dice el servidor en /auth/me o lo dijo el socket
  // ANTES de que la barra montara (el connect_error llega primero, QA H2-2).
  const readonly =
    session?.company_suspended === true ||
    (session !== null && readonlySignal) ||
    (session !== null && socketManager.getLastConnectErrorCode() === API_ERROR_CODES.supportReadonlySuspended)
  const warnedReadonly = useRef(false)
  useEffect(() => {
    if (!readonly || warnedReadonly.current) return
    warnedReadonly.current = true
    showAlert({ tone: "warning", ...SUPPORT_READONLY_COPY, autoCloseMs: 8000 })
  }, [readonly, showAlert])

  const left = session ? minutesLeft(session.expires_at, now) : null

  useEffect(() => {
    if (left === 0) void leave()
  }, [left, leave])

  if (!session || left === null) return null

  return (
    <div
      role="region"
      aria-label="Sesión de soporte"
      className="bg-foreground text-background flex h-8 shrink-0 items-center gap-2 px-3 text-xs sm:px-4"
    >
      <LifeBuoy aria-hidden="true" className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">Soporte</span> · {session.tenant_name} ·{" "}
        {readonly ? <span className="font-medium">solo lectura, sin tiempo real · </span> : null}
        <span className="tabular-nums" aria-live="polite">
          quedan {left} min
        </span>
      </p>
      <button
        type="button"
        onClick={() => void leave()}
        disabled={leaving}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-current disabled:opacity-70"
      >
        {leaving ? <LoaderCircle aria-hidden="true" className="size-3 animate-spin" /> : <LogOut aria-hidden="true" className="size-3" />}
        Salir
      </button>
    </div>
  )
}
