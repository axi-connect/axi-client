"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  photoUploadQueue,
  type EnqueueRequest,
  type UploadItem,
} from "@/modules/catalog/infrastructure/stores/photo-upload-queue";

const EMPTY: readonly UploadItem[] = [];
/** Varias fotos que terminan juntas se resuelven con UN re-pedido del detalle. */
const REFRESH_DEBOUNCE_MS = 400;

/**
 * Las subidas en curso de un producto y cómo reaccionar cuando terminan.
 * `refresh` re-pide el detalle; al volver, las fotos ya terminadas salen de
 * la cola porque la galería las trae del servidor (sin parpadeo: la miniatura
 * local se quita después de que llega la real).
 */
export function usePhotoUploads(productId: string | null, refresh?: () => Promise<unknown>) {
  const all = useSyncExternalStore(photoUploadQueue.subscribe, photoUploadQueue.getSnapshot, () => EMPTY);
  const items = useMemo(
    () => (productId === null ? EMPTY : all.filter((item) => item.product_id === productId)),
    [all, productId],
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (productId === null) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const current = refreshRef.current;
      if (current === undefined) return;
      void current()
        .then(() =>
          photoUploadQueue.dismiss((item) => item.product_id === productId && item.status === "done"),
        )
        .catch(() => undefined);
    };
    const unsubscribe = photoUploadQueue.onUploaded((doneProductId) => {
      if (doneProductId !== productId) return;
      clearTimeout(timer);
      timer = setTimeout(settle, REFRESH_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [productId]);

  const enqueue = useCallback(
    (request: Omit<EnqueueRequest, "product_id">) =>
      productId === null ? [] : photoUploadQueue.enqueue({ ...request, product_id: productId }),
    [productId],
  );
  const retry = useCallback((id: string) => photoUploadQueue.retry(id), []);
  const discard = useCallback((id: string) => photoUploadQueue.dismiss((item) => item.id === id), []);

  return { items, enqueue, retry, discard };
}
