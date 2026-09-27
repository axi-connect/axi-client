"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { isInboxView } from "@/modules/inbox/domain/inbox"

const PARAM = "view"
const DEFAULT_VIEW = "all_open"
const BASE = "/workspace/inbox"

/** `/workspace/inbox/<id>` → `<id>`; la bandeja sin conversación → `null`. */
export function conversationIdFromPath(pathname: string | null): string | null {
  if (pathname === null || !pathname.startsWith(`${BASE}/`)) return null
  const id = pathname.slice(BASE.length + 1).split("/")[0]
  return id === "" ? null : decodeURIComponent(id)
}

/**
 * Espejo de la URL ⇄ store. No pinta nada; vive bajo el `<Suspense>` de la vista
 * porque lee `useSearchParams`. Dos cosas:
 *
 * - `?view=`, para que «Cerradas» o «En cola» se puedan compartir y sobrevivan a
 *   la recarga. Siempre con `replace`: cambiar cinco veces de vista no deja cinco
 *   entradas de historial. Un valor desconocido se ignora.
 * - La conversación abierta en la ruta, `/workspace/inbox/<id>` (auditoría
 *   IB1-H1: antes la URL no cambiaba, «Atrás» sacaba del inbox y no se podía
 *   compartir el enlace).
 *   - Abrir una conversación desde la bandeja hace `history.pushState`, que Next 15
 *     integra con el router, sin remontar la vista: el socket, la lista y el scroll
 *     siguen.
 *   - Pasar de una conversación a otra REEMPLAZA la entrada, así que sobre la bandeja
 *     hay siempre como mucho una.
 *   - «Atrás» cierra la conversación y vuelve a la lista.
 *   - Cerrarla desde la app (la flecha del celular) vuelve atrás si la entrada la
 *     pusimos nosotros; si se entró por el enlace, reemplaza.
 *
 * Búsqueda, orden y filtros se quedan en el store: espejarlos a la URL sería un
 * segundo serializador.
 */
export function InboxViewUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = useInboxStore((s) => s.view)
  const setView = useInboxStore((s) => s.setView)
  const selectedId = useInboxStore((s) => s.selectedId)
  const select = useInboxStore((s) => s.select)
  const hydrated = useRef(false)
  /** La última entrada de historial con conversación la pusimos nosotros. */
  const pushedRef = useRef(false)

  const pathId = conversationIdFromPath(pathname)

  // URL → store, una sola vez al montar (vista).
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const requested = searchParams.get(PARAM)
    if (isInboxView(requested) && requested !== useInboxStore.getState().view) setView(requested)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [])

  // store → URL (omitida en la vista por defecto; conserva `?panel=` y demás).
  useEffect(() => {
    if (!hydrated.current) return
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get(PARAM)
    const wanted = view === DEFAULT_VIEW ? null : view
    if (current === wanted) return
    if (wanted === null) params.delete(PARAM)
    else params.set(PARAM, wanted)
    const query = params.toString()
    router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false })
  }, [view, pathname, router, searchParams])

  // URL → store: la ruta manda cuando cambia por el historial (Atrás / Adelante) o al entrar.
  useEffect(() => {
    if (pathId === useInboxStore.getState().selectedId) return
    pushedRef.current = false
    void select(pathId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia la ruta
  }, [pathId])

  // store → URL: abrir o cerrar desde la app. Lee el store y no la captura del
  // render: al entrar por un deep-link, el efecto de arriba acaba de seleccionar
  // y la captura aún diría `null`.
  useEffect(() => {
    const wanted = useInboxStore.getState().selectedId
    const current = conversationIdFromPath(window.location.pathname)
    if (wanted === current) return
    const query = window.location.search
    if (wanted === null) {
      // Cerrar: si la entrada de la conversación la pusimos nosotros, volver a ella
      // es volver a la bandeja. Si se entró por el enlace, se reemplaza para no
      // apilar historial.
      if (pushedRef.current) {
        pushedRef.current = false
        window.history.back()
      } else {
        window.history.replaceState(null, "", `${BASE}${query}`)
      }
      return
    }
    const target = `${BASE}/${encodeURIComponent(wanted)}${query}`
    if (current === null) {
      // De la bandeja a una conversación: UNA entrada nueva.
      window.history.pushState(null, "", target)
      pushedRef.current = true
    } else {
      // De una conversación a otra: se reemplaza (auditoría IB2-H1). Sobre la bandeja
      // hay siempre como mucho una entrada de conversación, así que «Atrás» y cerrar
      // vuelven a la lista y no reabren la anterior.
      window.history.replaceState(null, "", target)
    }
  }, [selectedId])

  return null
}
