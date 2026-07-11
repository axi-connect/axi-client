import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice catalog — entidad Producto (físico o servicio),
 * con variantes/SKU y stock por variante.
 *
 * Invariantes del backend a respetar en la UI:
 * - Todo producto nace con ≥1 variante (`default_sku` XOR `variants[]` en el POST).
 * - `kind=service` exige `duration_minutes` (5..480) y no maneja stock.
 * - `PATCH /catalog/variants/:id` NO devuelve el producto → re-fetch tras editar.
 * - `PUT .../attribute-values` es replace-set: se envía el record completo.
 */
export type ProductDTO = Schemas["ProductDto"];
export type ProductListItemDTO = Schemas["ProductsListDto"]["data"][number];
export type CreateProductDTO = Schemas["CreateProductDto"];
export type UpdateProductDTO = Schemas["UpdateProductDto"];
export type SetAttributeValuesDTO = Schemas["SetAttributeValuesDto"];
export type UpsertVariantDTO = Schemas["UpsertVariantDto"];
export type UpdateVariantDTO = Schemas["UpdateVariantDto"];
export type AdjustStockDTO = Schemas["AdjustStockDto"];
export type StockDTO = Schemas["StockDto"];

export type ProductVariantDTO = ProductDTO["variants"][number];
export type ProductAttributeValueDTO = ProductDTO["attribute_values"][number];
export type ProductKind = ProductDTO["kind"];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  product: "Producto",
  service: "Servicio",
};

/** Query de `GET /catalog/products` (paginación offset, orden fijo created_at desc). */
export type ListProductsParams = {
  q?: string;
  catalog_id?: string;
  category_id?: string;
  kind?: ProductKind;
  is_active?: boolean;
  page?: number;
  page_size?: number;
};

/** Estado agregado de stock de un producto (derivado de sus variantes activas). */
export type ProductStockState = "ok" | "low" | "out" | "none";

export const PRODUCT_STOCK_LABELS: Record<ProductStockState, string> = {
  ok: "Disponible",
  low: "Stock bajo",
  out: "Agotado",
  none: "—",
};

/** Forma plana que consumen la tabla y el grid (mapeo en fetchProducts). */
export type ProductRow = {
  id: string;
  name: string;
  kind: ProductKind;
  image_url: string | null;
  category_id: string | null;
  category_name: string;
  price_cents: number;
  currency: string;
  price_label: string;
  variant_count: number;
  stock_total: number | null;
  stock_state: ProductStockState;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
};

/**
 * Agrega el stock de las variantes activas: servicios → `none`;
 * todas agotadas → `out`; alguna agotada → `low`; el resto → `ok`.
 */
export function aggregateStock(item: ProductListItemDTO): {
  total: number | null;
  state: ProductStockState;
} {
  if (item.kind === "service") return { total: null, state: "none" };
  const active = item.variants.filter((variant) => variant.is_active);
  if (active.length === 0) return { total: 0, state: "out" };
  const total = active.reduce((sum, variant) => sum + (variant.stock?.on_hand ?? 0), 0);
  const unavailable = active.filter((variant) => !(variant.stock?.available ?? false)).length;
  if (unavailable === active.length) return { total, state: "out" };
  if (unavailable > 0) return { total, state: "low" };
  return { total, state: "ok" };
}
