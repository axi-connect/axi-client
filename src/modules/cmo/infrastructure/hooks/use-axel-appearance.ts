"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isAxelAccessory, type AxelAccessory } from "@/modules/cmo/domain/axel-avatar";

const STORAGE_KEY = "axi.cmo.axel.accessory";
const CHANGE_EVENT = "cmo:axel-appearance:change";
const DEFAULT: AxelAccessory = "none";

function read(): AxelAccessory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isAxelAccessory(raw) ? raw : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Qué lleva puesto Axel (hoy: diadema o nada). Es una **preferencia local del
 * navegador**, no un ajuste del tenant: no viaja al servidor porque no cambia
 * nada de lo que Axel hace, solo cómo se ve en esta pantalla. Se guarda en
 * `localStorage` y se propaga entre pestañas con el evento `storage`; en la
 * misma pestaña, con un `CustomEvent` propio.
 *
 * `useSyncExternalStore` con snapshot de servidor fijo: en SSR y en el primer
 * pintado se ve la cara sin accesorio, y al hidratar se aplica la preferencia.
 */
export function useAxelAccessory(): [AxelAccessory, (next: AxelAccessory) => void] {
  const accessory = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const setAccessory = useCallback((next: AxelAccessory) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado estricto) la elección dura lo que dura la pestaña.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);
  return [accessory, setAccessory];
}
