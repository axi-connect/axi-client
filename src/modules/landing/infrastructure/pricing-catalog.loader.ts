import "server-only";

import { HttpError } from "@/core/api/problem";
import { HttpClient } from "@/core/services/http";
import { catalogFromApi, type PublicCatalog, type PublicPricingDto } from "../domain/public-catalog";

/**
 * Lo que revalida la página. El API cachea otros 60 s (Redis) y no hay
 * invalidación bajo demanda hacia Next, así que un cambio publicado en el
 * panel tarda HASTA 120 s en verse en la landing: dos cachés en cadena.
 * Deuda anotada en el plan (Tanda B): `revalidateTag` desde un route handler
 * llamado por el subscriber de `billing.catalog_changed`.
 */
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
 * primer render con respuesta reemplaza al vacío en menos de un minuto. Si el
 * build corre SIN API alcanzable, la primera versión servida es «precios a
 * consulta» hasta el primer hit tras el despliegue (runbook de despliegue).
 */
export async function loadPublicCatalog(): Promise<PublicCatalog | null> {
  try {
    const dto = await new HttpClient().get<PublicPricingDto>("/public/pricing", undefined, {
      authenticate: false,
      revalidate: CATALOG_REVALIDATE_SECONDS,
    });
    return catalogFromApi(dto);
  } catch (error) {
    // Solo código/estado/mensaje: el objeto entero arrastraría el cuerpo de un
    // 5xx al log del servidor de Next.
    const detail =
      error instanceof HttpError
        ? { status: error.status, code: error.code, message: error.message }
        : { message: error instanceof Error ? error.message : String(error) };
    console.warn("[landing] catálogo público no disponible, se pinta «precios a consulta»", detail);
    return null;
  }
}
