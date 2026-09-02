import { http } from "@/core/services/http";
import type {
  CatalogImportDTO,
  CatalogImportItemDTO,
  CatalogImportItemPatchDTO,
  CommitCatalogImportDTO,
} from "@/modules/onboarding/domain/catalog-import";

/**
 * Adapter HTTP del import de catálogo (contrato B4). Multipart a través del
 * BFF: `HttpClient` no fija `Content-Type` cuando el cuerpo es `FormData`, así
 * que el boundary llega intacto al backend.
 */
export function createCatalogImport(file: File, options?: { default_currency?: string }): Promise<CatalogImportDTO> {
  const form = new FormData();
  form.append("file", file);
  if (options?.default_currency) form.append("default_currency", options.default_currency);
  return http.post<CatalogImportDTO>("/catalog/imports", form);
}

/** Detalle con `items[]`: es lo que se sondea mientras el job trabaja. */
export function getCatalogImport(importId: string): Promise<CatalogImportDTO> {
  return http.get<CatalogImportDTO>(`/catalog/imports/${importId}`);
}

export function patchCatalogImportItem(
  importId: string,
  itemId: string,
  patch: CatalogImportItemPatchDTO,
): Promise<CatalogImportItemDTO> {
  return http.put<CatalogImportItemDTO>(`/catalog/imports/${importId}/items/${itemId}`, patch);
}

/** 200: el job pasa a `committing`; el resultado llega por el mismo sondeo. */
export function commitCatalogImport(importId: string, dto: CommitCatalogImportDTO): Promise<CatalogImportDTO> {
  return http.post<CatalogImportDTO>(`/catalog/imports/${importId}/commit`, dto);
}

export function cancelCatalogImport(importId: string): Promise<CatalogImportDTO> {
  return http.post<CatalogImportDTO>(`/catalog/imports/${importId}/cancel`, {});
}
