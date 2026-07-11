import { http } from "@/core/services/http";
import type { Params } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  AdjustStockDTO,
  CreateProductDTO,
  ListProductsParams,
  ProductDTO,
  SetAttributeValuesDTO,
  StockDTO,
  UpdateProductDTO,
  UpdateVariantDTO,
  UpsertVariantDTO,
} from "@/modules/catalog/domain/product";

/**
 * Adapter HTTP del slice catalog → `/catalog/products` y `/catalog/variants`.
 * Paginación offset `{ data, meta }`; orden fijo `created_at desc` en backend.
 */
export function listProducts(params: ListProductsParams): Promise<Schemas["ProductsListDto"]> {
  return http.get<Schemas["ProductsListDto"]>("/catalog/products", params as Params);
}

export function getProductById(id: string): Promise<ProductDTO> {
  return http.get<ProductDTO>(`/catalog/products/${id}`);
}

export function createProduct(dto: CreateProductDTO): Promise<ProductDTO> {
  return http.post<ProductDTO>("/catalog/products", dto);
}

export function updateProduct(id: string, dto: UpdateProductDTO): Promise<ProductDTO> {
  return http.patch<ProductDTO>(`/catalog/products/${id}`, dto);
}

/** Soft-delete (el listado deja de incluirlo). */
export function deleteProduct(id: string): Promise<void> {
  return http.delete(`/catalog/products/${id}`);
}

/** Replace-set de valores EAV ámbito producto: enviar SIEMPRE el record completo. */
export function setProductAttributeValues(
  id: string,
  dto: SetAttributeValuesDTO,
): Promise<ProductDTO> {
  return http.put<ProductDTO>(`/catalog/products/${id}/attribute-values`, dto);
}

/** Devuelve el producto completo actualizado (a diferencia del PATCH de variante). */
export function createVariant(productId: string, dto: UpsertVariantDTO): Promise<ProductDTO> {
  return http.post<ProductDTO>(`/catalog/products/${productId}/variants`, dto);
}

/**
 * ⚠️ El backend responde `{ status: "updated" }`, no el producto:
 * el consumidor debe re-fetch con `getProductById` tras editar.
 */
export function updateVariant(id: string, dto: UpdateVariantDTO): Promise<{ status: string }> {
  return http.patch<{ status: string }>(`/catalog/variants/${id}`, dto);
}

/** Hard-delete; el backend protege la última variante activa del producto. */
export function deleteVariant(id: string): Promise<void> {
  return http.delete(`/catalog/variants/${id}`);
}

/** Requiere permiso `catalog:stock`. Solo variantes de productos físicos. */
export function adjustVariantStock(id: string, dto: AdjustStockDTO): Promise<StockDTO> {
  return http.patch<StockDTO>(`/catalog/variants/${id}/stock`, dto);
}
