import { FILM_NICHE_STORAGE_KEY, onboardingNicheFor } from "@/modules/landing/public";

/**
 * El nicho que el visitante eligió en la película de la home (o que trajo la
 * campaña en `?nicho=`), traducido al código del onboarding. Es una pista para
 * preseleccionar, nunca una decisión: el paso «Negocio» la muestra marcada y la
 * persona puede cambiarla. Vive en `localStorage` (mismo origen que la home).
 */
export function readFilmNicheHint(): string | null {
  try {
    return onboardingNicheFor(window.localStorage.getItem(FILM_NICHE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** `/comenzar?nicho=…` directo desde una campaña: se recuerda para el onboarding. */
export function rememberFilmNicheFromUrl(search: string): void {
  const raw = new URLSearchParams(search).get("nicho");
  if (!onboardingNicheFor(raw)) return;
  try {
    window.localStorage.setItem(FILM_NICHE_STORAGE_KEY, raw!.trim().toLowerCase());
  } catch {
    /* almacenamiento bloqueado: sin pista, el paso empieza vacío como siempre */
  }
}
