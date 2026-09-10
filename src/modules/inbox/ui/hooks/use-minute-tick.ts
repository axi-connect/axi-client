"use client"

import { useEffect, useState } from "react"

/**
 * `Date.now()` que avanza una vez por minuto. Un solo temporizador para toda
 * la lista: las etiquetas «Hoy → Ayer» y «12 min en cola» se recalculan en
 * bloque, en vez de un intervalo por fila.
 */
export function useMinuteTick(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
