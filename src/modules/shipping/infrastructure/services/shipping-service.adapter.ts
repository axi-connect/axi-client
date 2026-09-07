import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CreateShippingRateDTO,
  CreateShippingZoneDTO,
  ShippingSettingsDTO,
  ShippingZoneDTO,
  UpdateShippingRateDTO,
  UpdateShippingSettingsDTO,
  UpdateShippingZoneDTO,
} from "@/modules/shipping/domain/shipping";

/** Adapter HTTP del slice shipping → `/shipping` (plan envíos+promos F2). */
export async function listShippingZones(): Promise<ShippingZoneDTO[]> {
  const res = await http.get<Schemas["ShippingZonesListDto"]>("/shipping/zones");
  return res.data;
}

export function getShippingSettings(): Promise<ShippingSettingsDTO> {
  return http.get<ShippingSettingsDTO>("/shipping/settings");
}

export function updateShippingSettings(dto: UpdateShippingSettingsDTO): Promise<ShippingSettingsDTO> {
  return http.put<ShippingSettingsDTO>("/shipping/settings", dto);
}

export function createShippingZone(dto: CreateShippingZoneDTO): Promise<ShippingZoneDTO> {
  return http.post<ShippingZoneDTO>("/shipping/zones", dto);
}

export function updateShippingZone(id: string, dto: UpdateShippingZoneDTO): Promise<ShippingZoneDTO> {
  return http.patch<ShippingZoneDTO>(`/shipping/zones/${id}`, dto);
}

export function deleteShippingZone(id: string): Promise<void> {
  return http.delete(`/shipping/zones/${id}`);
}

export function createShippingRate(zoneId: string, dto: CreateShippingRateDTO): Promise<ShippingZoneDTO> {
  return http.post<ShippingZoneDTO>(`/shipping/zones/${zoneId}/rates`, dto);
}

export function updateShippingRate(id: string, dto: UpdateShippingRateDTO): Promise<ShippingZoneDTO> {
  return http.patch<ShippingZoneDTO>(`/shipping/rates/${id}`, dto);
}

export function deleteShippingRate(id: string): Promise<void> {
  return http.delete(`/shipping/rates/${id}`);
}

/**
 * Departamentos ISO 3166-2:CO desde el servidor (kernel `co_provinces.ts`): el
 * cliente NO duplica la lista — el espejo de Shopify casa por código y dos
 * copias divergentes dejarían de cotizar en silencio.
 */
export async function listCoProvinces(): Promise<{ code: string; name: string }[]> {
  const res = await http.get<Schemas["CoProvincesListDto"]>("/shipping/provinces");
  return res.data;
}
