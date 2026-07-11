import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CatalogDTO,
  CreateCatalogDTO,
  UpdateCatalogDTO,
} from "@/modules/catalog/domain/catalog";

/** Adapter HTTP del slice catalog → `/catalogs` (lista `{data}` sin meta). */
export function listCatalogs(): Promise<Schemas["CatalogListDto"]> {
  return http.get<Schemas["CatalogListDto"]>("/catalogs");
}

export function getCatalogById(id: string): Promise<CatalogDTO> {
  return http.get<CatalogDTO>(`/catalogs/${id}`);
}

export function createCatalog(dto: CreateCatalogDTO): Promise<CatalogDTO> {
  return http.post<CatalogDTO>("/catalogs", dto);
}

export function updateCatalog(id: string, dto: UpdateCatalogDTO): Promise<CatalogDTO> {
  return http.patch<CatalogDTO>(`/catalogs/${id}`, dto);
}

export function deleteCatalog(id: string): Promise<void> {
  return http.delete(`/catalogs/${id}`);
}
