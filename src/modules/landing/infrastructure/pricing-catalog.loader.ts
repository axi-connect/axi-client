import "server-only";

import { HttpClient } from "@/core/services/http";
import { catalogFromApi, type PublicCatalog, type PublicPricingDto } from "../domain/public-catalog";

/** Lo que revalida la página. El API cachea otros 60 s: dos cachés en cadena. */
export const CATALOG_REVALIDATE_SECONDS = 60;

/**
 * Carga del catálogo público en el servidor (RSC), una llamada por render.
 *
 * Nunca lanza: si el API no responde, devuelve `null` y la sección pinta
 * «precios a consulta» hasta la siguiente revalidación. Sin ficheros de
 * respaldo en el repo — un snapshot commiteado volvería a meter cifras en el
 * código por la puerta de atrás y se pudriría (plan §3.11).
 *
 * `next build` no depende del API: las páginas declaran `revalidate` y el
 * primer render con respuesta reemplaza al vacío en menos de un minuto.
 */
export async function loadPublicCatalog(): Promise<PublicCatalog | null> {
  try {
    const dto = await new HttpClient().get<PublicPricingDto>("/public/pricing", undefined, {
      authenticate: false,
      revalidate: CATALOG_REVALIDATE_SECONDS,
    });
    return catalogFromApi(dto);
  } catch (error) {
    console.warn("[landing] catálogo público no disponible, se pinta «precios a consulta»", error);
    return null;
  }
}
