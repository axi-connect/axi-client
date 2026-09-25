"use client"

import { useEffect, useRef, useState } from "react"
import { readTokenFromHash } from "../../domain/password"

export type HashTokenState =
  | { status: "reading" }
  | { status: "missing" }
  | { status: "found"; token: string }

/**
 * Lee UNA vez el token del fragmento (`#token=…`) y lo borra de inmediato de la
 * barra de direcciones con `history.replaceState`: así no queda en el
 * historial, no se comparte al copiar la URL y ninguna captura de pantalla lo
 * muestra. Desde ese momento vive solo en memoria de esta página.
 *
 * El borrado ocurre aunque el token no tenga forma válida: un fragmento con
 * basura tampoco debe quedarse en la URL. El resto de la URL (ruta y query) se
 * conserva.
 */
export function useHashToken(): HashTokenState {
  const [state, setState] = useState<HashTokenState>({ status: "reading" })
  // La lectura se guarda: en StrictMode el efecto corre dos veces y la segunda
  // ya encontraría el `#` borrado por la primera.
  const readRef = useRef<HashTokenState | null>(null)

  useEffect(() => {
    if (!readRef.current) {
      const { hash, pathname, search } = window.location
      const token = readTokenFromHash(hash)
      if (hash) window.history.replaceState(window.history.state, "", `${pathname}${search}`)
      readRef.current = token ? { status: "found", token } : { status: "missing" }
    }
    setState(readRef.current)
  }, [])

  return state
}
