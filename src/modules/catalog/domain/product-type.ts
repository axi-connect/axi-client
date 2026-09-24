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
  date: "Fecha",
};

/**
 * Tipos que el editor de tipos de producto OFRECE al crear un atributo.
 *
 * Existe porque `date` (F2 del programa Cobros: la fecha de salida de una
 * expedición) llegó al contrato antes que su control, y ofrecerlo entonces
 * habría hecho que los formularios lo pintaran como texto libre sin avisar.
 * Ya no: `AttributeValueInput` cubre los cinco tipos con un mapeo exhaustivo,
 * así que la lista es el catálogo completo. Se mantiene como la puerta por la
 * que pasa un tipo nuevo del backend: primero su control, después la oferta.
 */
export const SELECTABLE_ATTRIBUTE_TYPES: readonly AttributeType[] = [
  "text",
  "number",
  "boolean",
  "select",
  "date",
];

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

/**
 * El ejemplo del nombre de una variante, hablado en el idioma de SUS ejes: si
 * un eje es una fecha (la salida de una expedición), «Roja · M» no dice nada
 * (QA real F1–F2). Sin ejes o sin fecha, el ejemplo de siempre.
 */
export function variantNamePlaceholder(
  axes: readonly Pick<ProductTypeAttributeDTO, "type" | "scope">[],
): string {
  const variantAxes = axes.filter((axis) => axis.scope === "variant");
  if (variantAxes.some((axis) => axis.type === "date")) {
    return "Salida del 14 de marzo (opcional)";
  }
  return "Roja · M (opcional)";
}
