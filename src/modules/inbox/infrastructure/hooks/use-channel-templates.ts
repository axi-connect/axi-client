"use client"

import { useEffect, useState } from "react"
import { listHsmTemplates, type HsmTemplateDTO } from "@/modules/marketing/public"

/**
 * El catálogo de plantillas de Meta de un canal, para pintar el TEXTO de una
 * plantilla enviada (el mensaje solo guarda los valores de sus huecos).
 *
 * Cache a nivel de módulo, una petición por canal y sesión: un hilo con veinte
 * plantillas no hace veinte llamadas. Si la petición falla se olvida la entrada
 * y la burbuja cae a «nombre + datos con que salió», que nunca miente.
 */
const cache = new Map<string, Promise<HsmTemplateDTO[]>>()

function templatesOf(channelId: string): Promise<HsmTemplateDTO[]> {
  let entry = cache.get(channelId)
  if (!entry) {
    entry = listHsmTemplates({ channel_id: channelId }).catch((error: unknown) => {
      cache.delete(channelId)
      throw error
    })
    cache.set(channelId, entry)
  }
  return entry
}

/** Solo para tests: vacía la cache entre casos. */
export function resetChannelTemplatesCache(): void {
  cache.clear()
}

/**
 * La plantilla del catálogo con ese nombre e idioma. `undefined` mientras
 * carga, `null` si ya no está (se borró en Meta) o no se pudo leer.
 */
export function useChannelTemplate(
  channelId: string | null,
  name: string | null,
  language: string | null,
): HsmTemplateDTO | null | undefined {
  const [found, setFound] = useState<{ key: string; template: HsmTemplateDTO | null } | null>(null)
  const key = channelId && name ? `${channelId}:${name}:${language ?? ""}` : null

  useEffect(() => {
    if (!channelId || !name || key === null) return
    let alive = true
    templatesOf(channelId)
      .then((templates) => {
        if (!alive) return
        const match =
          templates.find((t) => t.name === name && (!language || t.language === language)) ??
          templates.find((t) => t.name === name) ??
          null
        setFound({ key, template: match })
      })
      .catch(() => {
        if (alive) setFound({ key, template: null })
      })
    return () => {
      alive = false
    }
  }, [channelId, name, language, key])

  if (key === null) return null
  return found?.key === key ? found.template : undefined
}
