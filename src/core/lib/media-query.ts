/**
 * Suscribe a los cambios de un `matchMedia` y devuelve la baja. Safari < 14 no
 * tiene `addEventListener` en `MediaQueryList` (solo el viejo `addListener`), y
 * llamarlo en un efecto lanzaba al entrar al panel (hotfix «Application error»,
 * 2026-10-19).
 */
export function onMediaQueryChange(mql: MediaQueryList, listener: () => void): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }
  mql.addListener(listener);
  return () => mql.removeListener(listener);
}
