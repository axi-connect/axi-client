import { elapsedShort } from "@/core/lib/day-label"

/** «hace 14 min», o «hace un momento» si acaba de entrar a la cola. */
export function sinceLabel(iso: string | null, now: number): string | null {
  if (iso === null) return null
  const elapsed = elapsedShort(iso, now)
  if (elapsed === "") return null
  return elapsed === "ahora" ? "hace un momento" : `hace ${elapsed}`
}
