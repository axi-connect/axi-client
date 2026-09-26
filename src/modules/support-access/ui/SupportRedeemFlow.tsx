"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { LoaderCircle } from "lucide-react"

import { PLATFORM_STORAGE_KEYS } from "@/modules/platform/domain/auth"
import { PasswordShell } from "@/modules/password/ui/components/PasswordShell"
import { broadcastAuthChange } from "@/shared/auth/auth-channel"
import { Button } from "@/shared/components/ui/button"
import {
  readHandoffCode,
  readHandoffNext,
  safeSupportNext,
  redeemFailure,
  REDEEM_FAILURE_COPY,
  type RedeemFailure,
} from "../domain/support-access"
import { redeemSupportCode } from "../infrastructure/support-access.service"

type State =
  | { step: "entering" }
  | { step: "failed"; reason: RedeemFailure | "missing" }
  | { step: "ended" }

function readPlatformToken(): string | null {
  try {
    return window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.token)
  } catch {
    return null
  }
}

/**
 * `/auth/soporte#code=…` — la pestaña de soporte (entrega F3).
 *
 * Lee el código del `#` UNA vez y lo borra de la barra con `replaceState`; lo
 * canjea en el BFF con el token de plataforma de esta pestaña (el
 * `sessionStorage` se copia al abrirla desde la consola) y entra al panel.
 * Con `?fin=1` es la despedida: la sesión de soporte terminó.
 */
export function SupportRedeemFlow() {
  const [state, setState] = useState<State>({ step: "entering" })
  const started = useRef(false)

  useEffect(() => {
    // StrictMode corre el efecto dos veces; el código sirve una sola.
    if (started.current) return
    started.current = true

    const { hash, pathname, search } = window.location
    if (new URLSearchParams(search).get("fin") === "1") {
      if (hash) window.history.replaceState(window.history.state, "", `${pathname}${search}`)
      // Venció, la cerraron desde la consola o se terminó aquí: las demás
      // pestañas vuelven a la sesión del cliente (si la hay).
      broadcastAuthChange("support-ended")
      setState({ step: "ended" })
      return
    }
    const code = readHandoffCode(hash)
    const next = safeSupportNext(readHandoffNext(hash), window.location.origin)
    if (hash) window.history.replaceState(window.history.state, "", `${pathname}${search}`)
    if (!code) {
      setState({ step: "failed", reason: "missing" })
      return
    }
    const platformToken = readPlatformToken()
    if (!platformToken) {
      setState({ step: "failed", reason: "no_platform_session" })
      return
    }
    void redeemSupportCode(code, platformToken).then((result) => {
      if (result.ok) {
        // Las pestañas del panel de cliente abiertas pasan a la sesión de soporte
        broadcastAuthChange("support-started")
        // A la pantalla pedida (solo si pasó la lista blanca), o al panel.
        window.location.replace(next)
        return
      }
      setState({ step: "failed", reason: redeemFailure(result.status, result.code) })
    })
  }, [])

  const closeTab = (
    <Button type="button" variant="outline" className="w-full" onClick={() => window.close()}>
      Cerrar esta pestaña
    </Button>
  )

  if (state.step === "entering") {
    return (
      <PasswordShell title="Entrando como soporte" focusOnMount>
        <p role="status" className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Abriendo el panel del cliente…
        </p>
      </PasswordShell>
    )
  }

  if (state.step === "ended") {
    return (
      <PasswordShell
        title="La sesión de soporte terminó"
        description="Venció, la cerraste o la cerraron desde la consola. Tu sesión de cliente en este navegador, si tenías una, sigue abierta tal cual."
        focusOnMount
      >
        <div className="space-y-2">
          {closeTab}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/dashboard">Ir a mi panel de cliente</Link>
          </Button>
        </div>
      </PasswordShell>
    )
  }

  const copy =
    state.reason === "missing"
      ? {
          title: "Falta el código de soporte",
          body: "Abre «Entrar como soporte» desde la ficha del tenant en la consola de plataforma, en este mismo navegador: la pestaña se abre sola con el código.",
        }
      : REDEEM_FAILURE_COPY[state.reason]
  // Sin sesión de plataforma en este navegador el camino es iniciarla aquí
  const toConsole = state.reason === "missing" || state.reason === "no_platform_session"

  return (
    <PasswordShell title={copy.title} description={copy.body} focusOnMount>
      {toConsole ? (
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/platform">Ir a la consola de plataforma</Link>
          </Button>
          {closeTab}
        </div>
      ) : (
        closeTab
      )}
    </PasswordShell>
  )
}
