import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice catalog — entidad Catálogo (agrupador raíz de productos).
 * Derivados del OpenAPI del backend; el tenant sale del token (sin company_id).
 */
export type CatalogDTO = Schemas["CatalogDto"];
export type CatalogListItemDTO = Schemas["CatalogListDto"]["data"][number];
export type CreateCatalogDTO = Schemas["CreateCatalogDto"];
export type UpdateCatalogDTO = Schemas["UpdateCatalogDto"];

/** Forma que consume la tabla (mapeo en fetchCatalogs). */
export type CatalogRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};
