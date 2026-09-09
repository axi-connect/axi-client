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

/**
 * Galería de imágenes del producto (F16). Una imagen pertenece al producto
 * (`variant_id: null`, "comodín" para todas las variantes) o a una variante
 * concreta. `url` es un thumbnail PRESIGNED con TTL ~300 s (efímero).
 */
export type ProductImageDTO = Schemas["ProductImageDto"];
export type ProductImageUrlDTO = Schemas["ProductImageUrlDto"];
export type ReorderProductImagesDTO = Schemas["ReorderProductImagesDto"];
export type ProductImageStatus = ProductImageDTO["status"];

/** Límites del backend, espejados para validar en cliente antes de subir. */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB (tope de WhatsApp Cloud API)
export const PRODUCT_GALLERY_MAX = 10; // fotos "comodín" del producto
export const VARIANT_GALLERY_MAX = 5; // fotos por variante
export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_MIME.join(",");

/** Polling del import por URL (no hay evento WS en esta fase). */
export const IMAGE_IMPORT_POLL_MS = 3_000;
export const IMAGE_IMPORT_POLL_TIMEOUT_MS = 30_000;

/** ¿Queda algún import por URL en curso? (dispara/detiene el polling). */
export function hasPendingImages(images: ProductImageDTO[] | undefined): boolean {
  return (images ?? []).some((image) => image.status === "pending");
}

/**
 * Intervalo del polling de import: `false` detiene (sin pendientes o se agotó
 * el presupuesto de ~30 s → botón manual "Actualizar"). Patrón de función
 * pura + `elapsedMs` inyectado, como `platform/domain/polling.ts`.
 */
export function imageImportPollInterval(pending: boolean, elapsedMs: number): number | false {
  if (!pending) return false;
  if (elapsedMs >= IMAGE_IMPORT_POLL_TIMEOUT_MS) return false;
  return IMAGE_IMPORT_POLL_MS;
}

/** Resultado de validar un archivo en cliente: `null` = válido, string = motivo. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number])) {
    return "Formato no soportado: usa JPEG, PNG o WebP.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "La imagen supera el máximo de 5 MB.";
  }
  return null;
}

/**
 * Separa la galería en fotos del producto (comodín) y fotos por variante,
 * cada contenedor ordenado por `position`. El backend ya entrega el array
 * ordenado, pero reordenamos por robustez ante mutaciones optimistas.
 */
export function groupProductImages(images: ProductImageDTO[] | undefined): {
  productImages: ProductImageDTO[];
  byVariant: Map<string, ProductImageDTO[]>;
} {
  const productImages: ProductImageDTO[] = [];
  const byVariant = new Map<string, ProductImageDTO[]>();
  for (const image of images ?? []) {
    if (image.variant_id === null) {
      productImages.push(image);
    } else {
      const bucket = byVariant.get(image.variant_id) ?? [];
      bucket.push(image);
      byVariant.set(image.variant_id, bucket);
    }
  }
  const byPosition = (a: ProductImageDTO, b: ProductImageDTO) => a.position - b.position;
  productImages.sort(byPosition);
  for (const bucket of byVariant.values()) bucket.sort(byPosition);
  return { productImages, byVariant };
}

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
  image_count: number;
  stock_total: number | null;
  stock_state: ProductStockState;
  duration_minutes: number | null;
  is_active: boolean;
  /** F17: no-null = espejo de una integración externa (badge de origen). */
  governed: boolean;
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

/**
 * Metadatos con IA del producto (plan catalog_enrichment): la descripción que
 * ve el agente en lugar de la ficha, los atributos según el vertical del
 * negocio y los términos con que lo piden los clientes. Viven en axi, no en la
 * tienda conectada; por eso se editan también en un producto espejado.
 */
export type ProductEnrichmentDTO = Schemas["ProductEnrichmentDto"];
export type UpdateProductEnrichmentDTO = Schemas["UpdateProductEnrichmentDto"];
export type ProductEnrichmentStatus = ProductEnrichmentDTO["status"];

export const ENRICHMENT_DESCRIPTION_MAX = 160;
export const ENRICHMENT_TERMS_MAX = 12;
export const ENRICHMENT_TERM_MAX_CHARS = 40;

/** Polling mientras el job genera (sin evento WS): mismo presupuesto que las fotos. */
export const ENRICHMENT_POLL_MS = 3_000;
export const ENRICHMENT_POLL_TIMEOUT_MS = 30_000;

export function enrichmentPollInterval(pending: boolean, elapsedMs: number): number | false {
  if (!pending) return false;
  if (elapsedMs >= ENRICHMENT_POLL_TIMEOUT_MS) return false;
  return ENRICHMENT_POLL_MS;
}

export type EnrichmentDisplayState =
  | "none"
  | "pending"
  | "ready"
  | "edited"
  | "disabled"
  | "failed";

/** Qué estado pinta la sección. `edited` gana sobre `ready`: el tenant debe
 * saber que el automático ya no toca esa fila. */
export function enrichmentDisplayState(
  enrichment: ProductEnrichmentDTO | null | undefined,
): EnrichmentDisplayState {
  if (!enrichment) return "none";
  if (enrichment.status === "pending") return "pending";
  if (enrichment.status === "disabled") return "disabled";
  if (enrichment.status === "failed") return "failed";
  return enrichment.edited_by_user_at ? "edited" : "ready";
}

export const ENRICHMENT_STATE_LABELS: Record<EnrichmentDisplayState, string> = {
  none: "Sin generar",
  pending: "Generando…",
  ready: "Listo",
  edited: "Editado por ti",
  disabled: "Desactivado",
  failed: "No se pudo generar",
};

/** Un `pending` sin nada generado aún es la espera del primer job. */
export function enrichmentHasContent(enrichment: ProductEnrichmentDTO | null | undefined): boolean {
  if (!enrichment) return false;
  return (
    (enrichment.description ?? "").length > 0 ||
    enrichment.search_terms.length > 0 ||
    Object.keys(enrichment.attributes).length > 0
  );
}

/** Añade un término si cabe, normalizado y sin duplicar (misma regla que el backend). */
export function addSearchTerm(terms: string[], raw: string): string[] {
  const term = raw.trim().toLowerCase().slice(0, ENRICHMENT_TERM_MAX_CHARS);
  if (term.length === 0 || terms.includes(term) || terms.length >= ENRICHMENT_TERMS_MAX) return terms;
  return [...terms, term];
}
