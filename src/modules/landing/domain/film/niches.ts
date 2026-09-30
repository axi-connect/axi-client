/**
 * Los nichos de la película de la home (programa «Landing cinematográfica», D4–D5).
 *
 * TypeScript puro. El nicho llega por `?nicho=` (campañas) o se elige en la
 * escena «¿Quién te escribe hoy?»; sin ninguno se muestra el negocio de
 * ejemplo, que es Tecnología. Moda NO está a propósito: el agente todavía no
 * cierra de forma fiable productos con tallas o colores (knowledge-base §6.4),
 * y la película no promete lo que el producto no cumple.
 */

export const FILM_NICHES = ["restaurants", "tech", "beauty", "b2b"] as const;

export type FilmNiche = (typeof FILM_NICHES)[number];

/** El negocio de ejemplo: el que se ve si nadie elige. */
export const DEFAULT_FILM_NICHE: FilmNiche = "tech";

/** Clave de `localStorage` donde el visitante recuerda su nicho (conveniencia, no estado). */
export const FILM_NICHE_STORAGE_KEY = "axi.film.nicho";

export function isFilmNiche(value: unknown): value is FilmNiche {
  return typeof value === "string" && (FILM_NICHES as readonly string[]).includes(value);
}

/**
 * Lee el nicho de un valor de URL o de almacenamiento. Acepta los alias que
 * usan las campañas (`?nicho=restaurantes`, `?nicho=belleza`) y los códigos del
 * onboarding (`health_beauty`…), en minúsculas y sin espacios. Lo desconocido
 * devuelve `null`: un enlace viejo no rompe la página, solo no personaliza.
 */
export function parseFilmNiche(raw: string | null | undefined): FilmNiche | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (isFilmNiche(key)) return key;
  return NICHE_ALIASES[key] ?? null;
}

const NICHE_ALIASES: Readonly<Record<string, FilmNiche>> = {
  restaurantes: "restaurants",
  restaurante: "restaurants",
  comida: "restaurants",
  tecnologia: "tech",
  "tecnología": "tech",
  retail: "tech",
  belleza: "beauty",
  salud: "beauty",
  health_beauty: "beauty",
  servicios: "b2b",
  professional_services: "b2b",
  b2b_distribution: "b2b",
};

/**
 * Código de nicho del onboarding al que corresponde cada nicho de la película
 * (`modules/onboarding/domain/niches.ts`). Tecnología cae en «Retail»: es el
 * catálogo con stock que más se le parece; el onboarding no tiene uno propio.
 */
export const FILM_NICHE_TO_ONBOARDING: Readonly<Record<FilmNiche, string>> = {
  restaurants: "restaurants",
  tech: "retail_fashion",
  beauty: "health_beauty",
  b2b: "b2b_distribution",
};

/**
 * El código de nicho del onboarding que corresponde a un valor crudo (de la
 * URL o del almacenamiento). `null` si no es un nicho de la película.
 */
export function onboardingNicheFor(raw: string | null | undefined): string | null {
  const niche = parseFilmNiche(raw);
  return niche ? FILM_NICHE_TO_ONBOARDING[niche] : null;
}
