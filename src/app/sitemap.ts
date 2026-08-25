import type { MetadataRoute } from "next";

import { siteUrl } from "@/core/config/env";
import { INDEXABLE_ROUTES } from "@/core/seo/routes";

/**
 * `/sitemap.xml` — se deriva entero de `INDEXABLE_ROUTES`, así que añadir una
 * página pública nueva al inventario la publica aquí sin tocar este archivo.
 *
 * Registrada en `PUBLIC_PATHS`, igual que `/robots.txt` (ver ahí el motivo).
 *
 * `lastModified` usa la fecha de arranque del servidor y no una fecha fija por
 * ruta: mentir con un `lastModified` que no se corresponde con un cambio real
 * hace que Google deje de fiarse del campo. Como el sitio se reconstruye en
 * cada deploy, la fecha del build es la aproximación honesta.
 */
const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((route) => ({
    url: siteUrl(route.path),
    lastModified: BUILD_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
