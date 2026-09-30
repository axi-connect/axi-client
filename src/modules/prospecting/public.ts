/**
 * API pública de `prospecting` (captación de leads) para otros módulos.
 *
 * Hoy: las cifras del embudo, que el Resumen de marketing enseña en su tarjeta
 * «Captación de leads». Piden `leads:read`: quien llama comprueba el permiso
 * antes de pedirlas.
 */
export type { ProspectingStatsDTO } from "./domain/lead";
export { getProspectingStats } from "./infrastructure/services/prospecting-service.adapter";

/**
 * P5 (piloto automático): el formulario del piloto elige la fuente y sus
 * categorías con el MISMO catálogo que Captación › Búsquedas.
 */
export type { DiscoveryCategoryDTO, SourceCatalogItemDTO } from "./domain/search";
export { listSources } from "./infrastructure/services/prospecting-service.adapter";
