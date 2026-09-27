"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

/**
 * Modo de la columna de vistas y canales del workspace (F1).
 *
 * - Desde `xl` hay sitio para la columna, la lista, el chat y el rail de contexto.
 *   La preferencia de la persona (`expanded` / `compact`) manda y se recuerda por
 *   navegador. Sin preferencia (`auto`), la columna va desplegada.
 * - Por debajo de `xl` desplegarla aplastaría el panel (a 1024 px dejaba 184 px
 *   para «Tu día»). Ahí es siempre riel, y el botón la ASOMA flotando sobre la
 *   lista (`peek`), como el Mail del iPad. El asomo no se recuerda: se cierra al
 *   elegir, con Escape o al tocar fuera.
 *
 * El modo automático lo pinta el CSS con `data-mode` y `data-peek`, así que no
 * hay salto al hidratar. La preferencia es una comodidad de quien mira: vive en
 * `localStorage` y cualquier fallo de almacenamiento se ignora.
 */
export type RailPreference = "expanded" | "compact"
export type RailMode = RailPreference | "auto"

export const RAIL_STORAGE_KEY = "axi.workspace.rail"
/** El `xl` de Tailwind: desde aquí la columna puede ir desplegada en su sitio. */
export const RAIL_WIDE_QUERY = "(min-width: 80rem)"

function readPreference(): RailPreference | null {
  try {
    const value = window.localStorage.getItem(RAIL_STORAGE_KEY)
    return value === "expanded" || value === "compact" ? value : null
  } catch {
    return null
  }
}

function writePreference(value: RailPreference): void {
  try {
    window.localStorage.setItem(RAIL_STORAGE_KEY, value)
  } catch {
    // Ventana privada o almacenamiento bloqueado: el modo vale para esta visita.
  }
}

function subscribeWide(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {}
  const media = window.matchMedia(RAIL_WIDE_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function isWide(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(RAIL_WIDE_QUERY).matches
}

export interface RailModeState {
  /** La preferencia guardada, o `auto`: va en `data-mode`. */
  mode: RailMode
  /** Asomada sobre la lista (solo por debajo de `xl`): va en `data-peek`. */
  peek: boolean
  /** ¿Se ven los nombres? Para lo que el CSS no puede decidir: tooltips y `aria-expanded`. */
  expanded: boolean
  toggle: () => void
  closePeek: () => void
}

export function useRailMode(): RailModeState {
  const [preference, setPreference] = useState<RailPreference | null>(null)
  const [peek, setPeek] = useState(false)
  useEffect(() => setPreference(readPreference()), [])
  // En el servidor vale «estrecho»; el ancho de verdad llega al hidratar.
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false)

  // Al cruzar a `xl` el asomo sobra: la columna ya tiene su sitio.
  useEffect(() => {
    if (wide) setPeek(false)
  }, [wide])

  const expanded = wide ? preference !== "compact" : peek

  const toggle = useCallback(() => {
    if (!wide) {
      setPeek((current) => !current)
      return
    }
    const next: RailPreference = preference === "compact" ? "expanded" : "compact"
    setPreference(next)
    writePreference(next)
  }, [wide, preference])

  const closePeek = useCallback(() => setPeek(false), [])

  return { mode: preference ?? "auto", peek, expanded, toggle, closePeek }
}
