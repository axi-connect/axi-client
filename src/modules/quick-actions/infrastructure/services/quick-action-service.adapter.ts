import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  CreateQuickActionDTO,
  ListQuickActionsParams,
  QuickActionAssetDTO,
  QuickActionDTO,
  UpdateQuickActionDTO,
} from "@/modules/quick-actions/domain/quick-action";

/** Adapter HTTP del slice quick-actions (`/quick-actions`, permiso read/manage). */
export function listQuickActions(
  params: ListQuickActionsParams = {},
): Promise<Paginated<QuickActionDTO>> {
  return http.get<Paginated<QuickActionDTO>>("/quick-actions", params);
}

export function getQuickAction(id: string): Promise<QuickActionDTO> {
  return http.get<QuickActionDTO>(`/quick-actions/${id}`);
}

export function createQuickAction(dto: CreateQuickActionDTO): Promise<QuickActionDTO> {
  return http.post<QuickActionDTO>("/quick-actions", dto);
}

export function updateQuickAction(id: string, dto: UpdateQuickActionDTO): Promise<QuickActionDTO> {
  return http.patch<QuickActionDTO>(`/quick-actions/${id}`, dto);
}

export function deleteQuickAction(id: string): Promise<void> {
  return http.delete<void>(`/quick-actions/${id}`);
}

/** Sube un archivo del tenant; se vincula a la acción vía `asset_ids` al guardar. */
export function uploadQuickActionAsset(file: File): Promise<QuickActionAssetDTO> {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.post<QuickActionAssetDTO>("/quick-actions/assets", form);
}

export function deleteQuickActionAsset(assetId: string): Promise<void> {
  return http.delete<void>(`/quick-actions/assets/${assetId}`);
}

/** URL firmada (TTL 300 s) para previsualizar un asset en la configuración. */
export function getQuickActionAssetUrl(
  assetId: string,
): Promise<{ url: string; expires_in_seconds: number }> {
  return http.get(`/quick-actions/assets/${assetId}/url`);
}
