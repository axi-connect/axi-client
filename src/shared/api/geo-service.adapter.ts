import type { Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";

/** Un sitio del mapa tal como lo devuelve el geocodificador core (`GET /geo/search`). */
export type GeocodedPlace = Schemas["GeoSearchResultsDto"]["items"][number];

/**
 * Autocompletado de direcciones para CUALQUIER tenant: `/geo/search` es core
 * (sin capacidad de plan; exige `companies:manage`). Captación conserva su
 * propio `/prospecting/geocode` bajo `leads`. Vive en `shared/api` porque lo
 * consumen dos slices (companies y, en el futuro, prospecting) y `shared` no
 * puede importar de `modules`.
 *
 * El servidor responde 429 cuando el carril hacia OpenStreetMap está ocupado y
 * no hay caché: quien llama lo degrada a «sin sugerencias» (LocationSearch ya
 * lo hace con su `.catch`).
 */
export async function searchPlaces(query: string, country = "CO"): Promise<GeocodedPlace[]> {
  const { items } = await http.get<Schemas["GeoSearchResultsDto"]>("/geo/search", {
    q: query,
    country,
  });
  return items;
}
