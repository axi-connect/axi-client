import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type { DealDTO, ListDealsParams } from "@/modules/crm/domain/deal";

/**
 * Adapter HTTP de deals (`/crm/deals`, permiso crm:read). F2 solo necesita el
 * listado (deals del contacto en el 360); move/win/lose/reopen, stats, events
 * y board se completan en F3.
 */
export function listDeals(params: ListDealsParams = {}): Promise<Paginated<DealDTO>> {
  return http.get<Paginated<DealDTO>>("/crm/deals", params);
}
