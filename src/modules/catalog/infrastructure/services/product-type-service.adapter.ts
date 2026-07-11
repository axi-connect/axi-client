import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CreateProductTypeDTO,
  ProductTypeDTO,
  SetProductTypeAttributesDTO,
  UpdateProductTypeDTO,
} from "@/modules/catalog/domain/product-type";

/** Adapter HTTP del slice catalog → `/catalog/product-types`. */
export function listProductTypes(): Promise<Schemas["ProductTypeListDto"]> {
  return http.get<Schemas["ProductTypeListDto"]>("/catalog/product-types");
}

export function getProductTypeById(id: string): Promise<ProductTypeDTO> {
  return http.get<ProductTypeDTO>(`/catalog/product-types/${id}`);
}

export function createProductType(dto: CreateProductTypeDTO): Promise<ProductTypeDTO> {
  return http.post<ProductTypeDTO>("/catalog/product-types", dto);
}

export function updateProductType(id: string, dto: UpdateProductTypeDTO): Promise<ProductTypeDTO> {
  return http.patch<ProductTypeDTO>(`/catalog/product-types/${id}`, dto);
}

/**
 * Replace-set del attribute set completo (máx 50). Eliminar un atributo del
 * array borra sus valores en cascada — la UI confirma antes de guardar.
 */
export function setProductTypeAttributes(
  id: string,
  dto: SetProductTypeAttributesDTO,
): Promise<ProductTypeDTO> {
  return http.put<ProductTypeDTO>(`/catalog/product-types/${id}/attributes`, dto);
}

/** 409 `catalog/product_type_in_use` si tiene productos asociados. */
export function deleteProductType(id: string): Promise<void> {
  return http.delete(`/catalog/product-types/${id}`);
}
