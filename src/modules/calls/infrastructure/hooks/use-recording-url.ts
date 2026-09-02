"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCallRecordingUrl } from "@/modules/calls/infrastructure/services/calls-service.adapter";

/** Margen antes de que expire la URL firmada para pedir una fresca. */
const RENEW_MARGIN_MS = 30_000;

type CacheEntry = { url: string; expires_at: number };

// Cache a nivel de módulo (patrón use-attachment-url del inbox): reabrir el
// mismo detalle no re-pide la URL mientras siga viva, y las peticiones
// concurrentes se deduplican.
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

async function fetchFreshUrl(sessionId: string): Promise<string> {
  const pending = inflight.get(sessionId);
  if (pending) return pending;
  const request = getCallRecordingUrl(sessionId)
    .then((result) => {
      cache.set(sessionId, {
        url: result.url,
        expires_at: Date.now() + result.expires_in_seconds * 1000,
      });
      return result.url;
    })
    .finally(() => inflight.delete(sessionId));
  inflight.set(sessionId, request);
  return request;
}

export type RecordingUrlStatus = "idle" | "loading" | "ready" | "error";

/**
 * URL firmada de la grabación de una llamada, con carga PEREZOSA: no pide
 * nada hasta que `load()` se invoque (el primer play del AudioPlayerCore).
 * `refresh()` fuerza una URL nueva — para el `onError` del <audio> cuando la
 * firmada expiró en pantalla.
 */
export function useRecordingUrl(sessionId: string): {
  url: string | null;
  status: RecordingUrlStatus;
  load: () => void;
  refresh: () => void;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<RecordingUrlStatus>("idle");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setUrl(null);
    setStatus("idle");
    return () => {
      mountedRef.current = false;
    };
  }, [sessionId]);

  const load = useCallback(() => {
    const cached = cache.get(sessionId);
    if (cached && cached.expires_at - Date.now() > RENEW_MARGIN_MS) {
      setUrl(cached.url);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    fetchFreshUrl(sessionId)
      .then((fresh) => {
        if (!mountedRef.current) return;
        setUrl(fresh);
        setStatus("ready");
      })
      .catch(() => {
        if (mountedRef.current) setStatus("error");
      });
  }, [sessionId]);

  const refresh = useCallback(() => {
    cache.delete(sessionId);
    load();
  }, [sessionId, load]);

  return { url, status, load, refresh };
}
