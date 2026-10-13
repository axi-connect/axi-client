import { http } from "@/core/services/http";
import type { StorageSummaryDTO } from "@/modules/storage/domain/storage";

/**
 * Adapter HTTP del almacenamiento del tenant. `GET /storage/summary` exige
 * `storage:read` (solo owner/admin): quien no lo tiene no lo pide.
 */
export function getStorageSummary(): Promise<StorageSummaryDTO> {
  return http.get<StorageSummaryDTO>("/storage/summary");
}
