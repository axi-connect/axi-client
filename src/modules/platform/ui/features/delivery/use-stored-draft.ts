"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseStoredDeliveryDraft,
  serializeDeliveryDraft,
  type DeliveryFormValues,
  type StoredDeliveryDraft,
} from "./delivery-form.config";

/** Pausa tras el último cambio antes de guardar el borrador en este navegador. */
export const DRAFT_AUTOSAVE_MS = 800;

export function readStoredDraft(key: string): StoredDeliveryDraft | null {
  try {
    return parseStoredDeliveryDraft(window.localStorage.getItem(key));
  } catch {
    // Sin acceso al almacenamiento (modo privado, bloqueado): no hay borrador.
    return null;
  }
}

function writeStoredDraft(key: string, values: DeliveryFormValues): boolean {
  try {
    window.localStorage.setItem(key, serializeDeliveryDraft(values, new Date()));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}

/**
 * El borrador de «Preparar entrega» (DESIGN-SYSTEM §9.7): se guarda solo, una
 * pausa después de cada cambio; lo que llega precargado (`baseline`) no cuenta
 * como cambio. `resumed` es el borrador que había AL ENTRAR: el aviso
 * «Retomaste tu borrador» sale con él y no aparece por escribir.
 */
export function useStoredDraft({
  storageKey,
  values,
  baseline,
  initial,
}: {
  storageKey: string;
  values: DeliveryFormValues;
  baseline: DeliveryFormValues;
  /** El borrador leído al montar (el mismo que precargó el formulario). */
  initial: StoredDeliveryDraft | null;
}) {
  const [resumed, setResumed] = useState<StoredDeliveryDraft | null>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(initial?.saved_at ?? null);
  const savedJson = useRef(JSON.stringify(baseline));

  useEffect(() => {
    const json = JSON.stringify(values);
    if (json === savedJson.current) return;
    const timer = setTimeout(() => {
      if (writeStoredDraft(storageKey, values)) {
        savedJson.current = json;
        setSavedAt(new Date().toISOString());
      }
    }, DRAFT_AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [values, storageKey]);

  /** Borra el borrador; `fresh` son los valores del contexto a los que vuelve el formulario. */
  const discard = useCallback(
    (fresh: DeliveryFormValues) => {
      clearStoredDraft(storageKey);
      savedJson.current = JSON.stringify(fresh);
      setResumed(null);
      setSavedAt(null);
    },
    [storageKey],
  );

  return { resumed, savedAt, discard };
}
