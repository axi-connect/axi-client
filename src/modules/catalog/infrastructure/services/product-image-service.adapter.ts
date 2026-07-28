import { http } from "@/core/services/http";
import type {
  ProductImageDTO,
  ProductImageUrlDTO,
  ReorderProductImagesDTO,
} from "@/modules/catalog/domain/product";

/**
 * Adapter HTTP de la galería de imágenes del catálogo (F16).
 *
 * Los uploads viajan como `multipart/form-data`: el `http` singleton detecta
 * `FormData` y NO fija `Content-Type` (el navegador pone el boundary). El
 * campo binario se llama `file`; `alt_text` es opcional.
 *
 * `url` de cada imagen es un thumbnail PRESIGNED con TTL ~300 s: tratarla como
 * efímera y, ante un 403 al pintarla, re-fetch del detalle del producto.
 */
function buildImageForm(file: File, altText?: string): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  if (altText && altText.trim()) form.append("alt_text", altText.trim());
  return form;
}

/** Sube una foto a la galería del PRODUCTO (comodín para todas las variantes). */
export function uploadProductImage(
  productId: string,
  file: File,
  altText?: string,
): Promise<ProductImageDTO> {
  return http.post<ProductImageDTO>(
    `/catalog/products/${productId}/images`,
    buildImageForm(file, altText),
  );
}

/** Sube una foto a la galería de una VARIANTE (el backend deriva el producto). */
export function uploadVariantImage(
  variantId: string,
  file: File,
  altText?: string,
): Promise<ProductImageDTO> {
  return http.post<ProductImageDTO>(
    `/catalog/variants/${variantId}/images`,
    buildImageForm(file, altText),
  );
}

/** Presigned del ORIGINAL (para el lightbox/zoom); pedirla fresca al abrir. */
export function getImageOriginalUrl(imageId: string): Promise<ProductImageUrlDTO> {
  return http.get<ProductImageUrlDTO>(`/catalog/images/${imageId}/url`);
}

/**
 * Replace-set del orden de UN contenedor (producto o una variante).
 * `image_ids` debe ser el set COMPLETO de la galería (parcial/ajeno → 404).
 * La primera posición es la foto principal (la que la IA envía primero).
 */
export function reorderProductImages(
  productId: string,
  dto: ReorderProductImagesDTO,
): Promise<void> {
  return http.put(`/catalog/products/${productId}/images/reorder`, dto);
}

/** Soft-delete: desaparece de la galería; los mensajes enviados conservan su copia. */
export function deleteProductImage(imageId: string): Promise<void> {
  return http.delete(`/catalog/images/${imageId}`);
}
