import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  ProductEnrichmentDTO,
  UpdateProductEnrichmentDTO,
} from "@/modules/catalog/domain/product";

/**
 * Adapter HTTP de los metadatos con IA de un producto (plan catalog_enrichment).
 * El detalle del producto ya trae `enrichment`; el GET suelto sirve para el
 * polling mientras el job genera. Regenerar es 202 (cola): el resultado llega
 * en segundos y se lee con el GET.
 */
export function getProductEnrichment(productId: string): Promise<ProductEnrichmentDTO> {
  return http.get<ProductEnrichmentDTO>(`/catalog/products/${productId}/enrichment`);
}

/** «Generar con IA» / «Regenerar»: orden explícita, reemplaza tus ediciones. */
export function regenerateProductEnrichment(
  productId: string,
): Promise<Schemas["EnrichmentAcceptedDto"]> {
  return http.post<Schemas["EnrichmentAcceptedDto"]>(`/catalog/products/${productId}/enrichment`, {});
}

/** Corrección manual (marca la fila como editada: el automático no la pisa). */
export function updateProductEnrichment(
  productId: string,
  dto: UpdateProductEnrichmentDTO,
): Promise<void> {
  return http.patch(`/catalog/products/${productId}/enrichment`, dto);
}

/** Aplica la categoría sugerida. En un espejado el backend responde gobernado. */
export function applySuggestedCategory(productId: string): Promise<void> {
  return http.post(`/catalog/products/${productId}/enrichment/apply-category`, {});
}
