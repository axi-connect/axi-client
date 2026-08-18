"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncRunsPollInterval } from "@/modules/integrations/domain/integration";

/**
 * Polling del historial de sincronizaciones (patrón
 * `use-product-images-polling` de catalog — no hay WS de integraciones y no se
 * abre uno para esto): re-fetch cada 3 s mientras haya un run vivo; tras ~2 min
 * expone `stalled` y la UI ofrece el botón manual.
 */
export function useSyncRunsPolling(hasActive: boolean, refetch: () => Promise<void>) {
  const [stalled, setStalled] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!hasActive) {
      startedAtRef.current = null;
      setStalled(false);
      return;
    }
    startedAtRef.current ??= Date.now();

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const interval = syncRunsPollInterval(true, elapsed);
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
  }, [hasActive, epoch]);

  const resume = useCallback(async () => {
    startedAtRef.current = Date.now();
    setStalled(false);
    await refetchRef.current().catch(() => undefined);
    setEpoch((n) => n + 1);
  }, []);

  return { stalled, resume };
}
