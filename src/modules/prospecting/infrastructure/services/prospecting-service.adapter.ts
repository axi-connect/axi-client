import type { Paginated, Schemas } from "@/core/api/types";
import { http, type Params } from "@/core/services/http";

import type {
  AxisWeightsDTO,
  IcpDTO,
  IcpDefinitionDTO,
  LeadDTO,
  LeadDetailDTO,
  LeadSource,
  LeadStatus,
  OutreachChannel,
  PromoteResultDTO,
  ProspectingStatsDTO,
  QualityStatus,
  QualitySummaryDTO,
} from "../../domain/lead";
import type {
  AdmissionDTO,
  DiscoveryCategoryDTO,
  GeocodedPlaceDTO,
  SearchDTO,
  SearchSource,
  SourceCatalogItemDTO,
} from "../../domain/search";

export type ProspectingSettingsDTO = Schemas["ProspectingSettingsDto"];
export type SuppressionDTO = Schemas["SuppressionDto"];

export interface ListLeadsParams extends Params {
  page?: number;
  page_size?: number;
  status?: LeadStatus;
  source?: LeadSource;
  quality_status?: QualityStatus;
  /** «Enséñame solo los que permiten WhatsApp». */
  allows?: OutreachChannel;
  min_score?: number;
  city?: string;
  q?: string;
}

/**
 * Adapter HTTP de la captación (`/prospecting`).
 *
 * Gotcha del contrato: `POST /prospecting/leads/promote` responde **200 con
 * resultado por lead**, no 2xx/4xx global. Que uno de cinco esté suprimido no
 * invalida los otros cuatro, así que la UI tiene que leer `failed` aunque la
 * petición haya ido bien.
 */
export function listLeads(
  params: ListLeadsParams = {},
): Promise<Paginated<LeadDTO>> {
  return http.get<Paginated<LeadDTO>>("/prospecting/leads", params);
}

export function getLead(leadId: string): Promise<LeadDetailDTO> {
  return http.get<LeadDetailDTO>(`/prospecting/leads/${leadId}`);
}

export function getProspectingStats(): Promise<ProspectingStatsDTO> {
  return http.get<ProspectingStatsDTO>("/prospecting/stats");
}

/** Requiere `leads:promote`. Ver el gotcha del 200 con fallos parciales. */
export function promoteLeads(leadIds: string[]): Promise<PromoteResultDTO> {
  return http.post<PromoteResultDTO>("/prospecting/leads/promote", {
    lead_ids: leadIds,
  });
}

export function discardLead(leadId: string, reason?: string): Promise<void> {
  return http.post<void>(`/prospecting/leads/${leadId}/discard`, { reason });
}

export function listSuppressions(): Promise<SuppressionDTO[]> {
  return http.get<SuppressionDTO[]>("/prospecting/suppressions");
}

export function createSuppression(input: {
  kind: SuppressionDTO["kind"];
  value: string;
  reason?: string;
}): Promise<SuppressionDTO> {
  return http.post<SuppressionDTO>("/prospecting/suppressions", input);
}

export function removeSuppression(id: string): Promise<void> {
  return http.delete<void>(`/prospecting/suppressions/${id}`);
}

export function getProspectingSettings(): Promise<ProspectingSettingsDTO> {
  return http.get<ProspectingSettingsDTO>("/prospecting/settings");
}

export function updateProspectingSettings(
  input: ProspectingSettingsDTO,
): Promise<ProspectingSettingsDTO> {
  return http.put<ProspectingSettingsDTO>("/prospecting/settings", input);
}

// ============================================================================
// F2 — motor de calidad
// ============================================================================

/** Siempre devuelve algo: el backend crea el default lazy. */
export function getIcp(): Promise<IcpDTO> {
  return http.get<IcpDTO>("/prospecting/icp");
}

/**
 * Guardar el cliente ideal re-puntúa la base **sin gastar cuota**, así que
 * responde de inmediato con el ICP guardado: el re-cálculo va por detrás.
 */
export function updateIcp(input: {
  name?: string;
  definition: IcpDefinitionDTO;
  weights?: AxisWeightsDTO;
}): Promise<IcpDTO> {
  return http.put<IcpDTO>("/prospecting/icp", input);
}

export function getQualitySummary(): Promise<QualitySummaryDTO> {
  return http.get<QualitySummaryDTO>("/prospecting/quality/summary");
}

/** Re-puntúa un lead. SÍ puede gastar cuota: por eso pide `leads:manage`. */
export function verifyLead(
  leadId: string,
): Promise<{ lead_id: string; score: number; status: QualityStatus }> {
  return http.post(`/prospecting/leads/${leadId}/verify`);
}

// ============================================================================
// F4b — enriquecimiento
// ============================================================================

/**
 * Buscarle a UN lead los datos que le faltan, ahora.
 *
 * Responde 202: el trabajo se hace en una cola porque una sola pasada puede
 * hablar con cuatro proveedores y descargar páginas de un sitio ajeno — eso no
 * cabe en la espera de un clic. `queued` devuelve los ids aceptados.
 *
 * **Este sí gasta cuota** (`leads:manage`): lo pide una persona que está mirando
 * ese lead, que es justo el momento en que pagar por un dato tiene sentido.
 */
export function enrichLead(leadId: string): Promise<{ queued: string[] }> {
  return http.post(`/prospecting/leads/${leadId}/enrich`);
}

/**
 * Lo mismo para una selección, pero **sin gastar una sola unidad**.
 *
 * El backend fuerza el lote a los proveedores gratuitos, y no es una cortesía:
 * cien leads contra proveedores de pago es exactamente cómo se funde la cuota
 * de un plan en un clic. Casi todo lo que hace falta —dirección, NIT, correo y
 * redes de la propia web— sale igualmente de lo gratis.
 */
export function enrichLeads(leadIds: string[]): Promise<{ queued: string[] }> {
  return http.post("/prospecting/leads/enrich", { lead_ids: leadIds });
}

// ============================================================================
// F4 — búsquedas
// ============================================================================

/**
 * Lanzar una búsqueda. Responde **202**: el trabajo lo hace la cola y la fila
 * es el reporte, así que la UI se queda con el id y sigue el progreso — no hay
 * nada que esperar aquí.
 *
 * Errores propios que la vista tiene que saber leer:
 * - `prospecting/search_in_flight` (409): ya hay una de esa fuente corriendo.
 * - `prospecting/no_discovery_quota` (429): se acabaron las unidades del ciclo.
 * - `prospecting/source_unavailable` (503): nadie encendió esa fuente en axi.
 */
export function startSearch(input: StartSearchInput): Promise<{ search_id: string }> {
  return http.post<{ search_id: string }>("/prospecting/searches", input);
}

export type StartSearchInput = {
  source: SearchSource;
  label?: string;
  text?: string;
  category?: string;
  city?: string;
  country?: string;
  center?: { lat: number; lng: number };
  radius_m?: number;
  /** Obligatorio: no existe «búscame todos». */
  limit: number;
  /**
   * Criterios de admisión. CON ellos, `limit` cuenta ADMITIDOS y el gasto lo
   * manda `admission.max_records`.
   */
  admission?: AdmissionDTO;
};

export function listSearches(): Promise<{ items: SearchDTO[] }> {
  return http.get<{ items: SearchDTO[] }>("/prospecting/searches");
}

export function getSearch(searchId: string): Promise<SearchDTO> {
  return http.get<SearchDTO>(`/prospecting/searches/${searchId}`);
}

export function listSources(): Promise<{
  items: SourceCatalogItemDTO[];
  categories: DiscoveryCategoryDTO[];
}> {
  return http.get("/prospecting/sources");
}

/** Cancela una búsqueda en vuelo y devuelve la fila con su estado final. */
export function cancelSearch(searchId: string): Promise<SearchDTO> {
  return http.post<SearchDTO>(`/prospecting/searches/${searchId}/cancel`, {});
}

/**
 * Buscar un lugar por su nombre.
 *
 * Va por nuestro backend y no contra el geocodificador directamente: su
 * política pide un `User-Agent` identificable y una petición por segundo, y un
 * navegador no puede garantizar ninguna de las dos.
 */
export function geocode(query: string): Promise<{ items: GeocodedPlaceDTO[] }> {
  return http.get<{ items: GeocodedPlaceDTO[] }>("/prospecting/geocode", { q: query });
}
