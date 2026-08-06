import type { Paginated } from "@/core/api/types";
import { http } from "@/core/services/http";
import type {
  CreatePromotionDTO,
  PromotionDTO,
  RedemptionDTO,
  UpdatePromotionDTO,
} from "@/modules/marketing/domain/promotion";

/**
 * Adapter HTTP de promociones y redenciones (`/marketing/promotions`).
 * El listado devuelve la colección completa (sin `page`): filtrado en cliente.
 */

export async function listPromotions(): Promise<PromotionDTO[]> {
  const res = await http.get<{ data: PromotionDTO[] }>("/marketing/promotions");
  return res.data;
}

export function getPromotion(id: string): Promise<PromotionDTO> {
  return http.get<PromotionDTO>(`/marketing/promotions/${id}`);
}

/** Los parámetros que no correspondan al `kind` → 422 `promotion_invalid_params`. */
export function createPromotion(dto: CreatePromotionDTO): Promise<PromotionDTO> {
  return http.post<PromotionDTO>("/marketing/promotions", dto);
}

export function updatePromotion(
  id: string,
  dto: UpdatePromotionDTO,
): Promise<PromotionDTO> {
  return http.patch<PromotionDTO>(`/marketing/promotions/${id}`, dto);
}

export function deletePromotion(id: string): Promise<void> {
  return http.delete<void>(`/marketing/promotions/${id}`);
}

export function listRedemptions(
  id: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Paginated<RedemptionDTO>> {
  return http.get<Paginated<RedemptionDTO>>(`/marketing/promotions/${id}/redemptions`, {
    ...params,
  });
}
