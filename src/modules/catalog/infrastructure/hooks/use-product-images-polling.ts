"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imageImportPollInterval } from "@/modules/catalog/domain/product";

/**
 * Polling del import de imágenes por URL (F16, sin evento WS en esta fase):
 * re-fetch del detalle cada 3 s mientras haya imágenes `pending`; se detiene
 * al no quedar pendientes o al desmontar. Tras ~30 s sin resolverse expone
 * `stalled` para que la UI muestre el botón manual "Actualizar" (`resume()`
 * reinicia el presupuesto).
 */
export function useProductImagesPolling(hasPending: boolean, refetch: () => Promise<void>) {
  const [stalled, setStalled] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  // `epoch` fuerza re-armar el efecto cuando el usuario pulsa "Actualizar".
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!hasPending) {
      startedAtRef.current = null;
      setStalled(false);
      return;
    }
    startedAtRef.current ??= Date.now();

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const interval = imageImportPollInterval(true, elapsed);
      if (interval === false) {
        setStalled(true);
        return;
      }
      timer = setTimeout(async () => {
        if (cancelled) return;
        await refetchRef.current().catch(() => undefined);
        if (!cancelled) tick();
      }, interval);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [hasPending, epoch]);

  /** Botón "Actualizar": re-fetch inmediato y reinicia el presupuesto de polling. */
  const resume = useCallback(async () => {
    startedAtRef.current = Date.now();
    setStalled(false);
    await refetchRef.current().catch(() => undefined);
    setEpoch((n) => n + 1);
  }, []);

  return { stalled, resume };
}
