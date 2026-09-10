"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { isInboxView } from "@/modules/inbox/domain/inbox"

const PARAM = "view"
const DEFAULT_VIEW = "all_open"

/**
 * Espejo `?view=` ⇄ store, para que «Cerradas» (o «En cola») sea compartible y
 * sobreviva a la recarga. Siempre `replace` (misma disciplina que alternar en
 * `use-context-panel`): cambiar cinco veces de vista no deja cinco entradas de
 * historial. Un valor desconocido se ignora. Búsqueda, orden y filtros se
 * quedan en el store: espejarlos a la URL sería un segundo serializador.
 *
 * No pinta nada; vive bajo el `<Suspense>` de la vista porque lee
 * `useSearchParams`.
 */
export function InboxViewUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = useInboxStore((s) => s.view)
  const setView = useInboxStore((s) => s.setView)
  const hydrated = useRef(false)

  // URL → store, una sola vez al montar.
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

  return null
}
