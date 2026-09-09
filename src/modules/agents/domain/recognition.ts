import type { Schemas } from "@/core/api/types";

/**
 * Contratos del reconocimiento de producto del slice agents.
 *
 * - Switch del tenant (`/ai-agents/recognition-settings`): opt-in de empresa —
 *   cada foto analizada consume un reconocimiento del plan y viene APAGADO por
 *   defecto, igual que la voz.
 * - Índice del catálogo (`/catalog/recognition/index-status` y `/reindex`):
 *   cuántos productos y fotos están vectorizados. Sin índice no hay nada que
 *   reconocer; el reindexado bajo demanda es idempotente (solo paga lo nuevo).
 */
export type RecognitionSettingsDTO = Schemas["RecognitionSettingsDto"];
export type RecognitionIndexStatusDTO = Schemas["RecognitionIndexStatusDto"];
/** Metadatos con IA del catálogo (plan catalog_enrichment): agregado para Ajustes. */
export type EnrichmentStatsDTO = Schemas["EnrichmentStatsDto"];
export type EnrichmentVertical = EnrichmentStatsDTO["vertical"];

/** Etiquetas del selector «Tipo de catálogo». `null` = deducir del nicho. */
export const ENRICHMENT_VERTICAL_LABELS: Record<EnrichmentVertical, string> = {
  fashion: "Moda y accesorios",
  food: "Restaurantes y comida",
  beauty: "Salud y belleza",
  home: "Hogar y decoración",
  tech: "Tecnología",
  generic: "Genérico",
};

/** Cuántos productos activos siguen sin metadatos listos ni desactivados. */
export function enrichmentPending(stats: EnrichmentStatsDTO): number {
  return Math.max(0, stats.products - stats.ready - stats.disabled);
}

/** Tope mensual alcanzado (o Redis sin respuesta: la UI no afirma nada). */
export function enrichmentCapReached(stats: EnrichmentStatsDTO): boolean {
  return stats.monthly_used !== null && stats.monthly_used >= stats.monthly_cap;
}

/** Cuántos productos activos siguen sin vector de texto. */
export function pendingProducts(status: RecognitionIndexStatusDTO): number {
  return Math.max(0, status.products - status.products_indexed);
}

/** Cuántas fotos `ready` siguen sin vector. */
export function pendingImages(status: RecognitionIndexStatusDTO): number {
  return Math.max(0, status.images - status.images_indexed);
}

/** Índice completo: nada pendiente. Con el catálogo vacío también es `true`
 * (no hay nada que indexar), y la vista lo dice con otras palabras. */
export function indexComplete(status: RecognitionIndexStatusDTO): boolean {
  return pendingProducts(status) === 0 && pendingImages(status) === 0;
}
