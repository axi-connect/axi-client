import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  EnrichmentStatsDTO,
  RecognitionIndexStatusDTO,
  RecognitionSettingsDTO,
} from "@/modules/agents/domain/recognition";

/**
 * Adapter HTTP del reconocimiento de producto (slice agents): switch del
 * tenant, estado del índice del catálogo y reindexado bajo demanda. Calco del
 * adapter de voz.
 */

/** Switch de reconocimiento de la empresa. Opt-in estricto: arranca en `false`. */
export function getRecognitionSettings(): Promise<RecognitionSettingsDTO> {
  return http.get<RecognitionSettingsDTO>("/ai-agents/recognition-settings");
}

/** Efecto en caliente: la siguiente foto ya obedece el switch. */
export function updateRecognitionSettings(dto: RecognitionSettingsDTO): Promise<void> {
  return http.put("/ai-agents/recognition-settings", dto);
}

/** Estado del índice vectorial: productos y fotos indexados vs. existentes. */
export function getRecognitionIndexStatus(): Promise<RecognitionIndexStatusDTO> {
  return http.get<RecognitionIndexStatusDTO>("/catalog/recognition/index-status");
}

/** Encola el reindexado completo (202). Idempotente por hash: repetirlo solo
 * paga por lo que cambió. */
export function requestRecognitionReindex(): Promise<Schemas["RecognitionReindexAcceptedDto"]> {
  return http.post<Schemas["RecognitionReindexAcceptedDto"]>("/catalog/recognition/reindex", {});
}

export type RecognitionUsage = Schemas["UsageSummaryDto"]["metrics"][number];

/**
 * Consumo de reconocimientos del ciclo (barra de la página de configuración).
 * `null` = el resumen no trae la métrica o falta el permiso `usage:read` — la
 * página simplemente no pinta la barra.
 */
export async function getRecognitionUsage(): Promise<RecognitionUsage | null> {
  try {
    const summary = await http.get<Schemas["UsageSummaryDto"]>("/usage/summary");
    return summary.metrics.find((entry) => entry.metric === "product_recognitions") ?? null;
  } catch {
    return null;
  }
}

/** Metadatos con IA del catálogo: agregado para la tarjeta de Ajustes. */
export function getEnrichmentStats(): Promise<EnrichmentStatsDTO> {
  return http.get<EnrichmentStatsDTO>("/catalog/enrichment/stats");
}

/** «Enriquecer catálogo» (202): genera solo lo que falta o quedó desactualizado;
 * lo editado por el tenant y lo desactivado no se tocan. */
export function requestEnrichmentBackfill(): Promise<Schemas["EnrichmentAcceptedDto"]> {
  return http.post<Schemas["EnrichmentAcceptedDto"]>("/catalog/enrichment/backfill", {});
}
