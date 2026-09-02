"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import {
  importPollInterval,
  isImportProcessing,
  type CatalogImportDTO,
} from "@/modules/onboarding/domain/catalog-import";
import { getCatalogImport } from "@/modules/onboarding/infrastructure/services/catalog-import-service.adapter";

/**
 * Sigue un job de import: sondea `GET /catalog/imports/:id` mientras esté en
 * proceso (2 s, luego 5 s) y se detiene al llegar a revisión o a un estado
 * terminal. A los tres minutos deja de preguntar y expone `stalled` para que la
 * UI ofrezca «seguir esperando». La fila del servidor es la verdad: si algún
 * día llega el WS `catalog.import_progress`, solo adelanta el refetch.
 */
export function useCatalogImportJob(importId: string | null) {
  const [job, setJob] = useState<CatalogImportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const refetch = useCallback(async () => {
    if (!importId) return null;
    try {
      const next = await getCatalogImport(importId);
      setJob(next);
      setError(null);
      return next;
    } catch (err) {
      setError(errorMessage(err, "No pudimos consultar el estado del archivo"));
      return null;
    }
  }, [importId]);

  useEffect(() => {
    if (!importId) {
      setJob(null);
      setStalled(false);
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = Date.now();
    setStalled(false);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const current = await refetch();
      if (cancelled) return;
      if (!current || !isImportProcessing(current.status)) return;
      const interval = importPollInterval(Date.now() - (startedAtRef.current ?? Date.now()));
      if (interval === false) {
        setStalled(true);
        return;
      }
      timer = setTimeout(() => void tick(), interval);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [importId, refetch, epoch]);

  /** «Seguir esperando»: reinicia el presupuesto y vuelve a sondear. */
  const resume = useCallback(() => {
    setStalled(false);
    setEpoch((n) => n + 1);
  }, []);

  /** Tras un commit u otra acción que cambia el job: vuelve a sondear desde ya. */
  const restart = resume;

  return { job, error, stalled, refetch, resume, restart, setJob };
}
