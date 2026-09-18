"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isAssistantAccessory, type AssistantAccessory } from "../avatar/avatar-rig";

export interface StoredAccessoryOptions {
  /** Clave de `localStorage`; una por asistente (`axi.cmo.axel.accessory`). */
  storageKey: string;
  /** Evento propio para avisar a la misma pestaña; `storage` cubre las demás. */
  changeEvent: string;
  fallback?: AssistantAccessory;
}

/**
 * Qué lleva puesto el personaje (hoy: diadema o nada). Es una **preferencia
 * local del navegador**, no un ajuste del tenant: no viaja al servidor porque
 * no cambia nada de lo que el asistente hace, solo cómo se ve en esta pantalla.
 * Se guarda en `localStorage` y se propaga entre pestañas con el evento
 * `storage`; en la misma pestaña, con un `CustomEvent` propio.
 *
 * `useSyncExternalStore` con snapshot de servidor fijo: en SSR y en el primer
 * pintado se ve la cara sin accesorio, y al hidratar se aplica la preferencia.
 *
 * Un asistente con accesorio FIJO (Alba y su diadema) no pasa por aquí: le da
 * el valor al avatar directamente.
 */
export function useStoredAccessory({
  storageKey,
  changeEvent,
  fallback = "none",
}: StoredAccessoryOptions): [AssistantAccessory, (next: AssistantAccessory) => void] {
  const read = useCallback((): AssistantAccessory => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return isAssistantAccessory(raw) ? raw : fallback;
    } catch {
      return fallback;
    }
  }, [storageKey, fallback]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      window.addEventListener(changeEvent, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(changeEvent, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    [changeEvent],
  );

  const accessory = useSyncExternalStore(subscribe, read, () => fallback);
  const setAccessory = useCallback(
    (next: AssistantAccessory) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Sin almacenamiento (modo privado estricto) la elección dura lo que dura la pestaña.
      }
      window.dispatchEvent(new CustomEvent(changeEvent));
    },
    [storageKey, changeEvent],
  );
  return [accessory, setAccessory];
}
