"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isReviewable,
  REVIEW_IDLE_MS,
  reviewKey,
  type TemplateCategoryReview,
  type TemplateDraftTextDTO,
} from "@/modules/marketing/domain/template-category-review";
import { reviewTemplateCategory } from "@/modules/marketing/infrastructure/services/templates-service.adapter";

/**
 * - `idle`: no hay nada que revisar (texto corto, o apagado);
 * - `settling`: se está escribiendo; Jev espera la pausa;
 * - `reviewing`: una petición en vuelo (el veredicto anterior sigue visible);
 * - `ready`: el veredicto es del texto ACTUAL;
 * - `unavailable`: la revisión falló (red, límite): se queda el último veredicto.
 */
export type JevReviewStatus = "idle" | "settling" | "reviewing" | "ready" | "unavailable";

export interface JevCategoryReview {
  status: JevReviewStatus;
  /** El último veredicto (del texto actual si `ready`; si no, el anterior). */
  review: TemplateCategoryReview | null;
  /** Revisar ya, sin esperar la pausa (al salir del campo del mensaje). */
  flush: () => void;
  /** El veredicto del texto actual, esperándolo si hace falta (antes de enviar). `null` si falla. */
  ensureFresh: () => Promise<TemplateCategoryReview | null>;
}

/**
 * Jev revisa el borrador sin evaluar cada tecla (hotfix 131049):
 * 1. tras `REVIEW_IDLE_MS` sin cambios, y solo si el texto cambió de verdad
 *    (huella normalizada: mayúsculas y espacios no cuentan);
 * 2. al salir del campo (`flush`);
 * 3. antes de enviar (`ensureFresh`), reutilizando lo ya revisado.
 *
 * Un texto ya revisado en la sesión no vuelve a costar una llamada, y la
 * petición vieja se aborta cuando el texto cambia. Hook propio y no React
 * Query: las páginas del tenant no montan su provider.
 */
export function useJevCategoryReview(
  draft: TemplateDraftTextDTO,
  { enabled = true }: { enabled?: boolean } = {},
): JevCategoryReview {
  const key = reviewKey(draft);
  const active = enabled && isReviewable(draft);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const keyRef = useRef(key);
  keyRef.current = key;

  const cache = useRef(new Map<string, TemplateCategoryReview>());
  const inflight = useRef<{
    key: string;
    promise: Promise<TemplateCategoryReview | null>;
    abort: AbortController;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<JevReviewStatus>("idle");
  const [review, setReview] = useState<TemplateCategoryReview | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  const run = useCallback((runKey: string, runDraft: TemplateDraftTextDTO): Promise<TemplateCategoryReview | null> => {
    if (inflight.current?.key === runKey) return inflight.current.promise;
    inflight.current?.abort.abort();
    const abort = new AbortController();
    setStatus("reviewing");
    // En un `async` para que un fallo síncrono también caiga en el `catch`.
    const promise = (async () => reviewTemplateCategory(runDraft, abort.signal))()
      .then((result) => {
        cache.current.set(runKey, result);
        if (keyRef.current === runKey) {
          setReview(result);
          setStatus("ready");
        }
        return result;
      })
      .catch(() => {
        // Abortada porque el texto cambió: la siguiente revisión manda. Otro
        // fallo (red, límite): se queda el último veredicto, sin avisos ruidosos.
        if (!abort.signal.aborted && keyRef.current === runKey) setStatus("unavailable");
        return null;
      })
      .finally(() => {
        if (inflight.current?.abort === abort) inflight.current = null;
      });
    inflight.current = { key: runKey, promise, abort };
    return promise;
  }, []);

  useEffect(() => {
    clearTimer();
    if (!active) {
      inflight.current?.abort.abort();
      inflight.current = null;
      setStatus("idle");
      return;
    }
    const cached = cache.current.get(key);
    if (cached !== undefined) {
      setReview(cached);
      setStatus("ready");
      return;
    }
    if (inflight.current?.key === key) return;
    setStatus("settling");
    timer.current = setTimeout(() => void run(key, draftRef.current), REVIEW_IDLE_MS);
    return clearTimer;
  }, [key, active, run]);

  // Al desmontar: nada queda en vuelo ni programado.
  useEffect(
    () => () => {
      clearTimer();
      inflight.current?.abort.abort();
    },
    [],
  );

  const flush = useCallback(() => {
    if (!active || cache.current.has(keyRef.current)) return;
    clearTimer();
    void run(keyRef.current, draftRef.current);
  }, [active, run]);

  const ensureFresh = useCallback(async () => {
    if (!active) return null;
    const cached = cache.current.get(keyRef.current);
    if (cached !== undefined) return cached;
    clearTimer();
    return run(keyRef.current, draftRef.current);
  }, [active, run]);

  return { status, review, flush, ensureFresh };
}
