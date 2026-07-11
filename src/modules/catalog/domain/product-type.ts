import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice catalog — entidad Tipo de producto (attribute set EAV).
 * Los atributos se reemplazan como conjunto completo vía
 * `PUT /catalog/product-types/:id/attributes` (replace-set, máx 50).
 */
export type ProductTypeDTO = Schemas["ProductTypeDto"];
export type ProductTypeListItemDTO = Schemas["ProductTypeListDto"]["data"][number];
export type CreateProductTypeDTO = Schemas["CreateProductTypeDto"];
export type UpdateProductTypeDTO = Schemas["UpdateProductTypeDto"];
export type SetProductTypeAttributesDTO = Schemas["SetProductTypeAttributesDto"];

/** Atributo tal como lo devuelve el backend (incluye id y position). */
export type ProductTypeAttributeDTO = ProductTypeDTO["attributes"][number];
/** Definición de atributo que se envía en el replace-set (sin id/position). */
export type AttributeDefinitionDTO = SetProductTypeAttributesDTO["attributes"][number];

export type AttributeType = ProductTypeAttributeDTO["type"];
export type AttributeScope = ProductTypeAttributeDTO["scope"];

export const MAX_ATTRIBUTES_PER_TYPE = 50;

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Sí / No",
  select: "Selección",
};

export const ATTRIBUTE_SCOPE_LABELS: Record<AttributeScope, string> = {
  product: "Producto",
  variant: "Variante",
};

/** `options` viaja como `unknown` en el spec; en la práctica es `string[]` para select. */
export function attributeOptions(attribute: ProductTypeAttributeDTO): string[] {
  return Array.isArray(attribute.options)
    ? attribute.options.filter((opt): opt is string => typeof opt === "string")
    : [];
}

/** Forma que consume la tabla (mapeo en fetchProductTypes). */
export type ProductTypeRow = {
  id: string;
  name: string;
  description: string | null;
  attribute_count: number;
  variant_axes_count: number;
  created_at: string;
};
