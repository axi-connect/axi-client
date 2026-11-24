import { http } from "@/core/services/http"
import type {
  ClearUndeliveredResultDTO,
  SequenceTrackingDTO,
} from "@/modules/prospecting/domain/sequence-tracking"

/** Adapter HTTP de «Seguimiento» de una secuencia (lote 1). */

function query(searchIds: readonly string[]): Record<string, string> {
  return searchIds.length === 0 ? {} : { search_ids: searchIds.join(",") }
}

export function getSequenceTracking(
  sequenceId: string,
  searchIds: readonly string[],
): Promise<SequenceTrackingDTO> {
  return http.get<SequenceTrackingDTO>(`/autopilot/sequences/${sequenceId}/tracking`, query(searchIds))
}

/** Quita del chat los WhatsApp de esta secuencia (y del filtro) que no se entregaron. */
export function clearUndelivered(
  sequenceId: string,
  searchIds: readonly string[],
): Promise<ClearUndeliveredResultDTO> {
  const params = new URLSearchParams(query(searchIds)).toString()
  return http.post<ClearUndeliveredResultDTO>(
    `/autopilot/sequences/${sequenceId}/tracking/clear-undelivered${params === "" ? "" : `?${params}`}`,
    {},
  )
}
