"use client";

import { usePathname } from "next/navigation";

import SiteHeader from "@/shared/components/layout/site/SiteHeader";
import { FilmHeader } from "@/modules/landing/ui/film/FilmHeader";

/**
 * Qué cabecera lleva cada página pública. La home es una película con su
 * propia cabecera en píldora (programa landing cinematográfica); el resto del
 * sitio conserva `SiteHeader` hasta que se rehaga con el mismo lenguaje (D14).
 *
 * Son dos componentes distintos y no una rama dentro de uno: así cada uno
 * tiene sus propios hooks y cambiar de ruta no altera el orden de ninguno.
 */
export function PublicHeader() {
  return usePathname() === "/" ? <FilmHeader /> : <SiteHeader />;
}
