"use client";

import dynamic from "next/dynamic";

/**
 * El cielo del hero, en diferido: no es contenido (el LCP es el titular) y así
 * no entra en el JS de primera carga de la home. Mientras llega, el hero ya
 * pinta su atardecer con el degradado CSS de `.film-hero-sky` (film.css).
 */
export const HeroSkyLazy = dynamic(() => import("./HeroSky").then((m) => m.HeroSky), { ssr: false });
