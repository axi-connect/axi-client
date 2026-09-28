import { http } from "@/core/services/http";
import type {
  CatalogSummaryDTO,
  ClassificationStatsDTO,
  EnrichmentStatsDTO,
} from "@/modules/catalog/domain/catalog-summary";

/**
 * Las cifras del bento del listado (catálogo premium F2). Tres lecturas
 * independientes: si una falla, su ficha lo dice y las demás se pintan.
 * `enrichment/stats` y `classification/stats` ya los usaba Agentes con su
 * propio adapter; los endpoints son del catálogo y el slice los lee aquí sin
 * cruzar la frontera.
 */
export function getCatalogSummary(): Promise<CatalogSummaryDTO> {
  return http.get<CatalogSummaryDTO>("/catalog/summary");
}

export function getCatalogEnrichmentStats(): Promise<EnrichmentStatsDTO> {
  return http.get<EnrichmentStatsDTO>("/catalog/enrichment/stats");
}

export function getCatalogClassificationStats(): Promise<ClassificationStatsDTO> {
  return http.get<ClassificationStatsDTO>("/catalog/classification/stats");
}
