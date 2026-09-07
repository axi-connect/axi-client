import { searchPlaces, type GeocodedPlace } from "@/shared/api/geo-service.adapter";

/** Autocompletado de direcciones de una sede, acotado al país de la empresa. */
export function searchBranchPlaces(query: string, countryCode: string): Promise<GeocodedPlace[]> {
  return searchPlaces(query, countryCode);
}
