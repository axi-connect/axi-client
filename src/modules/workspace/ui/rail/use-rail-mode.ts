"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

/**
 * Modo de la columna de vistas y canales del workspace (F1).
 *
 * - `auto` (sin preferencia): riel de 64 px entre `lg` y `xl`, desplegada desde
 *   `xl`. Lo pinta el CSS con `data-mode`, así que no hay salto al hidratar.
 * - `expanded` / `compact`: lo que eligió la persona con el botón, recordado por
 *   navegador. Es una comodidad de quien mira, no un dato: vive en
 *   `localStorage` y cualquier fallo de almacenamiento se ignora.
 */
export type RailPreference = "expanded" | "compact"
export type RailMode = RailPreference | "auto"

export const RAIL_STORAGE_KEY = "axi.workspace.rail"
/** El `xl` de Tailwind: desde aquí el modo automático despliega la columna. */
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

export function useRailMode(): { mode: RailMode; expanded: boolean; toggle: () => void } {
  const [preference, setPreference] = useState<RailPreference | null>(null)
  useEffect(() => setPreference(readPreference()), [])
  // Solo para lo que el CSS no puede decidir (tooltips, `aria-expanded`). En el
  // servidor vale «estrecho»; el ancho de verdad llega al hidratar.
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false)

  const expanded = (preference ?? (wide ? "expanded" : "compact")) === "expanded"

  const toggle = useCallback(() => {
    const next: RailPreference = expanded ? "compact" : "expanded"
    setPreference(next)
    writePreference(next)
  }, [expanded])

  return { mode: preference ?? "auto", expanded, toggle }
}
