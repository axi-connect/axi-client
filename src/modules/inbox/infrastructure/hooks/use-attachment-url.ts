"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAttachmentUrl } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"

/**
 * URLs firmadas de adjuntos (TTL 300 s del backend). Cache a nivel de módulo
 * compartida entre burbujas: dedupe de peticiones concurrentes y renovación
 * con margen de 30 s antes de expirar. `refresh()` invalida la entrada — se
 * usa desde onError de <img>/<audio>/<video> cuando la URL expiró en pantalla.
 */

interface CacheEntry {
  url?: string
  expiresAt: number
  inflight?: Promise<string>
}

const EXPIRY_MARGIN_MS = 30_000

const cache = new Map<string, CacheEntry>()

function cacheKey(conversationId: string, messageId: string, attachmentId: string): string {
  return `${conversationId}:${messageId}:${attachmentId}`
}

/** Función no-hook (misma cache): descargas puntuales y lightbox. */
export async function getFreshAttachmentUrl(
  conversationId: string,
  messageId: string,
  attachmentId: string,
): Promise<string> {
  const key = cacheKey(conversationId, messageId, attachmentId)
  const entry = cache.get(key)
  if (entry?.url && entry.expiresAt > Date.now()) return entry.url
  if (entry?.inflight) return entry.inflight

  const inflight = getAttachmentUrl(conversationId, messageId, attachmentId).then((result) => {
    cache.set(key, {
      url: result.url,
      expiresAt: Date.now() + Math.max(0, result.expires_in_seconds * 1000 - EXPIRY_MARGIN_MS),
    })
    return result.url
  })
  cache.set(key, { expiresAt: 0, inflight })
  return inflight.catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
}

export function invalidateAttachmentUrl(
  conversationId: string,
  messageId: string,
  attachmentId: string,
): void {
  cache.delete(cacheKey(conversationId, messageId, attachmentId))
}

/** Solo para tests: limpia la cache compartida. */
export function clearAttachmentUrlCache(): void {
  cache.clear()
}

export type AttachmentUrlStatus = "idle" | "loading" | "ready" | "error"

/**
 * Hook de burbuja. `enabled: false` = carga perezosa (el audio no pide URL
 * hasta el primer play). Guard anti-race por id de petición.
 */
export function useAttachmentUrl(
  conversationId: string,
  messageId: string,
  attachmentId: string | undefined,
  options: { enabled?: boolean } = {},
): { url: string | null; status: AttachmentUrlStatus; refresh: () => void } {
  const enabled = options.enabled ?? true
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<AttachmentUrlStatus>("idle")
  const requestRef = useRef(0)

  const load = useCallback(() => {
    if (!attachmentId) return
    const requestId = ++requestRef.current
    setStatus("loading")
    getFreshAttachmentUrl(conversationId, messageId, attachmentId)
      .then((freshUrl) => {
        if (requestRef.current !== requestId) return
        setUrl(freshUrl)
        setStatus("ready")
      })
      .catch(() => {
        if (requestRef.current !== requestId) return
        setStatus("error")
      })
  }, [conversationId, messageId, attachmentId])

  useEffect(() => {
    if (enabled && attachmentId) load()
  }, [enabled, attachmentId, load])

  const refresh = useCallback(() => {
    if (!attachmentId) return
    invalidateAttachmentUrl(conversationId, messageId, attachmentId)
    load()
  }, [conversationId, messageId, attachmentId, load])

  return { url, status, refresh }
}
