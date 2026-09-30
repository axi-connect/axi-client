"use client";

import dynamic from "next/dynamic";

/**
 * El fondo vivo del hero, en diferido: no es contenido (el LCP es el titular) y
 * así no entra en el JS de primera carga de la home. Mientras llega, el hero ya
 * pinta su brillo de marca con el degradado CSS de `.film-hero-glow` (film.css).
 *
 * - `HeroGradientLazy`: el gradiente de marca «con vida» del hero original
 *   (`BrandGradientCanvas`, WebGL), con los mismos parámetros.
 * - `HeroSkyLazy`: las conversaciones que flotan encima (canvas 2D).
 */
export const HeroGradientLazy = dynamic(
  () => import("@/modules/landing/ui/components/BrandGradientCanvas").then((m) => m.BrandGradientCanvas),
  { ssr: false },
);

export const HeroSkyLazy = dynamic(() => import("./HeroSky").then((m) => m.HeroSky), { ssr: false });
