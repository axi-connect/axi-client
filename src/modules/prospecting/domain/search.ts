import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

export type SearchDTO = Schemas["SearchDto"];
export type SearchStatus = SearchDTO["status"];
export type SearchSource = SearchDTO["source"];
export type SourceCatalogItemDTO = Schemas["SourcesCatalogDto"]["items"][number];

/**
 * El semáforo de una búsqueda.
 *
 * `partial` es `warning` y no `success` a propósito: significa que lo que se
 * compró no se puede usar tal cual —la mayoría de los leads llegaron sin
 * teléfono ni correo— y pintarlo en verde le diría al dueño que ya tiene algo
 * cuando lo que tiene es una lista de nombres.
 */
export const SEARCH_STATUS_MAP: StatusMap = {
  queued: { label: "En cola", tone: "info", transient: true },
  running: { label: "Buscando", tone: "info", transient: true },
  completed: { label: "Terminada", tone: "success" },
  partial: { label: "Parcial", tone: "warning" },
  failed: { label: "Falló", tone: "destructive" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const SEARCH_SOURCE_LABELS: Record<SearchSource, string> = {
  google_places: "Google Maps",
  openstreetmap: "OpenStreetMap",
  serp: "Buscador web",
};

/** Mientras esté en vuelo hay que seguirla: por WS y, de respaldo, por polling. */
export function isInFlight(search: SearchDTO): boolean {
  return search.status === "queued" || search.status === "running";
}

/**
 * Qué fracción lleva hecha, para la barra.
 *
 * Contra el TOPE que puso el tenant, no contra el estimado del proveedor: el
 * tope es lo que él decidió gastar y es la única cifra que no se mueve a mitad
 * de la búsqueda. Una barra que retrocede porque el estimado subió es peor que
 * no tener barra.
 */
export function progressOf(search: SearchDTO): number {
  if (!isInFlight(search)) return 1;
  if (search.params.limit <= 0) return 0;
  return Math.min(1, search.found_count / search.params.limit);
}

/**
 * La frase que resume una búsqueda terminada, en el idioma del dueño.
 *
 * Se escribe aquí y no en la vista porque es una REGLA: qué contar y en qué
 * orden. La vista pinta.
 */
export function summaryOf(search: SearchDTO): string {
  const parts = [`${search.new_count.toLocaleString("es-CO")} nuevos`];
  if (search.duplicate_count > 0) {
    parts.push(`${search.duplicate_count.toLocaleString("es-CO")} que ya tenías`);
  }
  if (search.rejected_count > 0) {
    parts.push(
      `${search.rejected_count.toLocaleString("es-CO")} fuera de tu cliente ideal`,
    );
  }
  return parts.join(" · ");
}

/** Lo que costó, dicho como se cobra. Cero unidades es «gratis», no «0». */
export function costOf(search: SearchDTO): string {
  return search.units_spent === 0
    ? "gratis"
    : `${search.units_spent.toLocaleString("es-CO")} unidades`;
}

/** Los parámetros de una búsqueda, para re-lanzarla tal cual. */
export function paramsOf(search: SearchDTO) {
  return {
    source: search.source,
    label: search.label ?? undefined,
    text: search.params.text ?? undefined,
    category: search.params.category ?? undefined,
    city: search.params.city ?? undefined,
    country: search.params.country,
    radius_m: search.params.radius_m ?? undefined,
    limit: search.params.limit,
  };
}

/** Lo que se le pregunta a la fuente, en una línea. */
export function queryOf(search: SearchDTO): string {
  const parts = [
    SEARCH_SOURCE_LABELS[search.source],
    search.params.category,
    search.params.text,
    search.params.city,
  ].filter(Boolean);
  return parts.join(" · ");
}

export type DiscoveryCategoryDTO =
  Schemas["SourcesCatalogDto"]["categories"][number];
export type GeocodedPlaceDTO = Schemas["GeocodeResultsDto"]["items"][number];

/**
 * Radios que ofrece el formulario, en metros.
 *
 * Discretos y no un deslizador libre: el radio es la mitad de cuánto vas a
 * gastar, y una lista corta se compara de un vistazo con lo que el mapa enseña.
 */
export const SEARCH_RADII = [
  { value: 1_000, label: "1 km · unas cuadras" },
  { value: 3_000, label: "3 km · el barrio" },
  { value: 8_000, label: "8 km · la zona" },
  { value: 20_000, label: "20 km · la ciudad" },
] as const;
