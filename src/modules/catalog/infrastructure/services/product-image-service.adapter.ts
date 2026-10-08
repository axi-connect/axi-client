import { http, type UploadOptions } from "@/core/services/http";
import type {
  ProductDTO,
  ProductImageDTO,
  ProductImageUrlDTO,
  ReorderProductImagesDTO,
  SetVariantPrimaryImagesDTO,
} from "@/modules/catalog/domain/product";

/**
 * Adapter HTTP de la galería del catálogo (F16 + plan catalog_images_gallery).
 * Es la ÚNICA entrada de fotos del panel: ya no hay campo URL en producto ni
 * variante.
 *
 * Las subidas son `multipart/form-data` por `http.upload` (XHR, para tener
 * progreso real). El campo binario es `file`; `make_primary` deja la foto como
 * principal de su contenedor aunque ya hubiera otra.
 *
 * La `url` de cada imagen es un thumbnail presigned estable durante una hora
 * (cacheable): ante un error al pintarla, re-pedir el detalle del producto.
 */
export type UploadImageInput = {
  file: File;
  altText?: string;
  makePrimary?: boolean;
};

function buildImageForm({ file, altText, makePrimary }: UploadImageInput): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  if (altText && altText.trim()) form.append("alt_text", altText.trim());
  if (makePrimary) form.append("make_primary", "true");
  return form;
}

/** Sube una foto GENERAL del producto (de todas sus variantes). */
export function uploadProductImage(
  productId: string,
  input: UploadImageInput,
  options?: UploadOptions,
): Promise<ProductImageDTO> {
  return http.upload<ProductImageDTO>(`/catalog/products/${productId}/images`, buildImageForm(input), options);
}

/** Sube una foto PROPIA de una variante (el backend deriva el producto). */
export function uploadVariantImage(
  variantId: string,
  input: UploadImageInput,
  options?: UploadOptions,
): Promise<ProductImageDTO> {
  return http.upload<ProductImageDTO>(`/catalog/variants/${variantId}/images`, buildImageForm(input), options);
}

/** Presigned del ORIGINAL (para el lightbox/zoom); pedirla fresca al abrir. */
export function getImageOriginalUrl(imageId: string): Promise<ProductImageUrlDTO> {
  return http.get<ProductImageUrlDTO>(`/catalog/images/${imageId}/url`);
}

/**
 * Replace-set del orden de UN contenedor (generales o las de una variante).
 * `image_ids` debe ser el set COMPLETO de la galería (parcial/ajeno → 404).
 */
export function reorderProductImages(productId: string, dto: ReorderProductImagesDTO): Promise<void> {
  return http.put(`/catalog/products/${productId}/images/reorder`, dto);
}

/** Soft-delete: si era principal, la reemplaza la siguiente lista. */
export function deleteProductImage(imageId: string): Promise<void> {
  return http.delete(`/catalog/images/${imageId}`);
}

/** Foto por URL (importador) cuya descarga falló: vuelve a intentarse en su misma fila. */
export function retryImageImport(imageId: string): Promise<ProductImageDTO> {
  return http.post<ProductImageDTO>(`/catalog/images/${imageId}/retry-import`, {});
}

/** Elige la principal del producto. Devuelve el producto entero, ya repintable. */
export function setProductPrimaryImage(productId: string, imageId: string): Promise<ProductDTO> {
  return http.put<ProductDTO>(`/catalog/products/${productId}/primary-image`, { image_id: imageId });
}

/** Principal de UNA variante; `null` = vuelve a usar la del producto. */
export function setVariantPrimaryImage(variantId: string, imageId: string | null): Promise<ProductDTO> {
  return http.put<ProductDTO>(`/catalog/variants/${variantId}/primary-image`, { image_id: imageId });
}

/** «Usar en variante…»: varias variantes en un guardado, todo o nada. */
export function setVariantPrimaryImages(productId: string, dto: SetVariantPrimaryImagesDTO): Promise<ProductDTO> {
  return http.put<ProductDTO>(`/catalog/products/${productId}/variant-primary-images`, dto);
}
