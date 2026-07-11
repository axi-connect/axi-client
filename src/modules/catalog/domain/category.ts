import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice catalog — entidad Categoría (árbol jerárquico).
 * El backend limita la profundidad a 6 niveles y usa hard-delete con guarda
 * de uso (409 `catalog/category_in_use` si tiene hijos o productos).
 */
export type CategoryDTO = Schemas["CategoryDto"];
export type CategoryTreeNodeDTO = Schemas["CategoryListDto__schema0"];
export type CreateCategoryDTO = Schemas["CreateCategoryDto"];
export type UpdateCategoryDTO = Schemas["UpdateCategoryDto"];

/** Respuesta de `GET /catalog/categories?tree=true` (nodos anidados). */
export type CategoryTreeDTO = { data: CategoryTreeNodeDTO[] };

/** Profundidad máxima del árbol (validada también en el backend). */
export const MAX_CATEGORY_DEPTH = 6;

/** Aplana el árbol a opciones indentadas para selects (`— Sub — Subsub`). */
export function flattenCategoryTree(
  nodes: CategoryTreeNodeDTO[],
  depth = 0,
): Array<{ id: string; label: string; depth: number; is_active: boolean }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.name, depth, is_active: node.is_active },
    ...flattenCategoryTree(node.children ?? [], depth + 1),
  ]);
}
