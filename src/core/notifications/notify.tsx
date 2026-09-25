"use client"

import { Info } from "lucide-react"
import { sileo } from "sileo"
import {
  type AlertTone,
  type AppAlert,
  type NotifyOptions,
  splitTitle,
  toSileoOptions,
  TONE_DURATION_MS,
} from "./to-options"

/**
 * Única puerta a sileo (DESIGN-SYSTEM §9.4). Ningún módulo importa `sileo`:
 * lo impide `no-restricted-imports` en `eslint.config.mjs`. Los módulos siguen
 * usando `useAlert().showAlert`; `notify` es para lo que el contrato viejo no
 * cubre (la promesa de un guardado que tarda).
 */

let seq = 0
const nextId = () => `axi-${++seq}`

// sileo trae un salvavidas para `info`; el icono de info del sistema es el de lucide.
const INFO_ICON = <Info aria-hidden="true" className="size-4" />

const SHOW: Record<AlertTone, (opts: NotifyOptions) => string> = {
  success: sileo.success,
  error: sileo.error,
  warning: sileo.warning,
  info: sileo.info,
}

export type PromiseMessage = string | { title: string; description?: string }

export type NotifyPromiseOptions<T> = {
  loading: string
  success: PromiseMessage | ((data: T) => PromiseMessage)
  error: PromiseMessage | ((err: unknown) => PromiseMessage)
}

function resolve(tone: AlertTone, message: PromiseMessage, duration: number): NotifyOptions {
  const { title, description } =
    typeof message === "string" ? { title: message, description: undefined } : message
  return { ...splitTitle(tone, title, description), duration }
}

/**
 * Un mismo error puede avisarse dos veces a la vez: la página muestra el suyo y
 * una señal global el mismo (la barra de soporte ante `support_action_forbidden`,
 * QA H2-1). Un aviso con el MISMO texto dentro de esta ventana no se repite.
 */
export const DEDUPE_WINDOW_MS = 3_000
const recent = new Map<string, { id: string; at: number }>()

function dedupeKey(alert: AppAlert): string {
  return (alert.description ?? alert.title).trim()
}

export const notify = {
  /** Lo que hace `showAlert`: traduce el aviso y lo pinta (sin repetir el mismo texto en 3 s). */
  fromAlert(alert: AppAlert, now: number = Date.now()): string {
    const key = dedupeKey(alert)
    const seen = recent.get(key)
    if (seen && now - seen.at < DEDUPE_WINDOW_MS) return seen.id
    for (const [k, v] of recent) if (now - v.at >= DEDUPE_WINDOW_MS) recent.delete(k)
    const opts = toSileoOptions(alert, nextId)
    const id = SHOW[alert.tone](alert.tone === "info" ? { ...opts, icon: INFO_ICON } : opts)
    recent.set(key, { id, at: now })
    return id
  },

  /**
   * Un solo aviso que nace en «cargando» y se transforma en el resultado. Lleva
   * id propio: un éxito que llegue mientras tanto no lo pisa. Devuelve la misma
   * promesa, así que el llamador sigue encadenando.
   */
  promise<T>(promise: Promise<T> | (() => Promise<T>), opts: NotifyPromiseOptions<T>): Promise<T> {
    return sileo.promise(promise, {
      loading: { title: opts.loading, id: nextId() } as NotifyOptions,
      success: (data: T) =>
        resolve(
          "success",
          typeof opts.success === "function" ? opts.success(data) : opts.success,
          TONE_DURATION_MS.success,
        ),
      error: (err: unknown) =>
        resolve(
          "error",
          typeof opts.error === "function" ? opts.error(err) : opts.error,
          TONE_DURATION_MS.error,
        ),
    })
  },

  dismiss(id: string): void {
    sileo.dismiss(id)
  },

  clear(): void {
    sileo.clear()
  },
}
