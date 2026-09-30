"use client";

import { useSyncExternalStore } from "react";

/** `md` de Tailwind: por debajo, el calendario es el del celular (lienzo F1). */
const MD_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MD_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * ¿Pantalla de md en adelante? En el servidor responde `true` (escritorio) y
 * el cliente corrige en la hidratación: la vista del celular no parpadea en
 * computador, que es donde más se usa la agenda.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MD_QUERY).matches, () => true);
}
