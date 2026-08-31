import type { Paginated, Schemas } from "@/core/api/types";
import { http, type Params } from "@/core/services/http";

import type {
  AxisWeightsDTO,
  IcpDTO,
  IcpDefinitionDTO,
  LeadDTO,
  LeadDetailDTO,
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
export type LeadIdsDTO = Schemas["LeadIdsDto"];
export type DeleteLeadsResultDTO = Schemas["DeleteLeadsResultDto"];
export type DeleteSearchesResultDTO = Schemas["DeleteSearchesResultDto"];
export type DeletionPreviewDTO = Schemas["DeletionPreviewDto"];

/**
 * Los filtros de la bandeja, tal como viajan.
 *
 * **Los multivalor van como CSV en un solo parámetro y NO como arreglo**, y no
 * es capricho: `Params` está tipado a primitivos y `http.ts` hace
 * `String(value)`, así que un arreglo funcionaría por accidente (`String(['a',
 * 'b'])` da `"a,b"`) y un objeto se convertiría en `"[object Object]"` sin que
 * nada avise. Se hace explícito aquí y el backend parte por comas.
 *
 * Los nombres son los del backend, que a su vez son los de los criterios de
 * admisión: `min_data`, `require`, `min_score`. Una sola forma de preguntar lo
 * mismo.
 */
export interface ListLeadsParams extends Params {
  page?: number;
  page_size?: number;
  /** CSV de `LeadStatus`. */
  status?: string;
  /** CSV de `LeadSource`. */
  source?: string;
  /** CSV de `QualityStatus`. */
  quality_status?: string;
  /** CSV de `LegalBasis`. */
  legal_basis?: string;
  /** «Enséñame solo los que permiten WhatsApp». Uno solo. */
  allows?: OutreachChannel;
  min_score?: number;
  max_score?: number;
  /** Cuántos de los cinco datos. Mismo nombre y rango que la admisión. */
  min_data?: number;
  /** CSV de `RequirableField`. */
  require?: string;
  require_mode?: "all" | "any";
  created_after?: string;
  created_before?: string;
  city?: string;
  q?: string;
  sort?: "score" | "data" | "recent";
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

/**
 * Cuántos leads cumplen un filtro, sin traerlos.
 *
 * `page_size: 1` y se lee `meta.total`: es el número que la hoja de filtros
 * pinta en su botón. **No hace falta un endpoint de conteo** — el listado ya lo
 * devuelve, y usar el mismo camino garantiza que el número y la lista no puedan
 * discrepar.
 */
export async function countLeads(params: ListLeadsParams = {}): Promise<number> {
  const page = await listLeads({ ...params, page: 1, page_size: 1 });
  return page.meta.total;
}

/**
 * Los ids de TODO lo que cumple el filtro.
 *
 * Lo que convierte «seleccionar los 249 que cumplen» en 249 ids reales, para
 * que las acciones en lote sigan recibiendo ids y la auditoría pueda decir a los
 * seis meses a QUIÉN se le escribió la PII en el CRM. `total` puede ser mayor
 * que `ids.length`: el tope acota el array, no el filtro.
 */
export function listLeadIds(
  params: Omit<ListLeadsParams, "page" | "page_size" | "sort"> = {},
): Promise<LeadIdsDTO> {
  return http.get<LeadIdsDTO>("/prospecting/leads/ids", params);
}

/**
 * Borrar de captación. Cinco rutas y ninguna papelera detrás.
 *
 * **No hay deshacer**, así que la confirmación de la interfaz es la única
 * barrera que existe. Y borrar **NO suprime**: el mismo negocio puede volver en
 * otra búsqueda —y con una fuente de pago, se vuelve a pagar—. Eso está escrito
 * aquí porque el dueño decidió, con el argumento delante, que la pantalla no lo
 * diga; que no lo diga la pantalla no significa que deje de ser cierto para
 * quien toque este código.
 *
 * Los resultados de lote cumplen una propiedad que la interfaz usa para leerse
 * sin contar filas: **`deleted + kept.length + missing` cuadra con lo enviado.**
 * `missing` es un NÚMERO y no una lista a propósito — después de un borrado
 * masivo no se puede saber cuál de los ausentes lo borramos nosotros, y dar ids
 * sería inventarse el detalle.
 */
export function deleteLead(leadId: string): Promise<void> {
  return http.delete<void>(`/prospecting/leads/${leadId}`);
}

export function deleteLeads(leadIds: readonly string[]): Promise<DeleteLeadsResultDTO> {
  return http.post<DeleteLeadsResultDTO>("/prospecting/leads/delete", {
    lead_ids: [...leadIds],
  });
}

export function deleteSearch(searchId: string): Promise<DeleteSearchesResultDTO> {
  return http.delete<DeleteSearchesResultDTO>(`/prospecting/searches/${searchId}`);
}

export function deleteSearches(
  searchIds: readonly string[],
): Promise<DeleteSearchesResultDTO> {
  return http.post<DeleteSearchesResultDTO>("/prospecting/searches/delete", {
    search_ids: [...searchIds],
  });
}

/**
 * Cuántos leads caerían al borrar estas búsquedas, y cuántos sobrevivirían.
 *
 * Existe porque `new_count` y `found_count` de la tarjeta son **históricos**:
 * dicen lo que la búsqueda trajo, y no se ajustan cuando se promueven o se
 * borran leads. En una confirmación irreversible, enseñar 184 y que el resultado
 * diga 120 se lee como que se perdió algo. El backend tiene un test que fija que
 * esta previa y el `leads_deleted` posterior coincidan.
 *
 * Sin ids devuelve 400 y no ceros, a propósito: un diálogo destructivo que
 * enseñe «0 leads» porque el parámetro se armó mal es peor que uno que no abra.
 */
export function previewSearchDeletion(
  searchIds: readonly string[],
): Promise<DeletionPreviewDTO> {
  return http.get<DeletionPreviewDTO>("/prospecting/searches/deletion-preview", {
    search_ids: searchIds.join(","),
  });
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
