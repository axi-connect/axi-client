import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CategoryDTO,
  CategoryTreeDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "@/modules/catalog/domain/category";

/** Adapter HTTP del slice catalog → `/catalog/categories`. */
export function listCategories(): Promise<Schemas["CategoryListDto"]> {
  return http.get<Schemas["CategoryListDto"]>("/catalog/categories");
}

/** Árbol anidado (`children[]`) — la vista de categorías y los selects lo consumen. */
export function listCategoryTree(): Promise<CategoryTreeDTO> {
  return http.get<CategoryTreeDTO>("/catalog/categories", { tree: true });
}

export function createCategory(dto: CreateCategoryDTO): Promise<CategoryDTO> {
  return http.post<CategoryDTO>("/catalog/categories", dto);
}

export function updateCategory(id: string, dto: UpdateCategoryDTO): Promise<CategoryDTO> {
  return http.patch<CategoryDTO>(`/catalog/categories/${id}`, dto);
}

/**
 * Borra una categoría propia (409 `catalog/category_in_use` si tiene hijos o
 * productos). Si es de la taxonomía de la plataforma, el backend la OCULTA.
 */
export function deleteCategory(id: string): Promise<void> {
  return http.delete(`/catalog/categories/${id}`);
}

/** Siembra (idempotente) la taxonomía del tipo de negocio: crea lo que falta, adopta lo que ya existe. */
export function ensurePlatformTaxonomy(): Promise<Schemas["PlatformTaxonomyResultDto"]> {
  return http.post<Schemas["PlatformTaxonomyResultDto"]>("/catalog/categories/platform-taxonomy", {});
}
