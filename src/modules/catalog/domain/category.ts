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

/** Origen de la categoría (plan catalog_taxonomy_classification, D2). */
export type CategoryOrigin = CategoryDTO["origin"];

export const CATEGORY_ORIGIN_LABELS: Record<CategoryOrigin, string> = {
  platform: "De la plataforma",
  tenant: "Propia",
  integration: "De la tienda conectada",
};

/**
 * Una categoría con `taxonomy_code` pertenece a la taxonomía del tipo de
 * negocio: no se borra, se OCULTA (el backend la deja inactiva para que la
 * siembra no la resucite). El panel usa el verbo correcto.
 */
export function isTaxonomyCategory(category: Pick<CategoryDTO, "taxonomy_code">): boolean {
  return category.taxonomy_code !== null;
}


/** Lo que resume el árbol en su ficha (catálogo premium F4, canvas tablero 8). */
export type CategoryTreeStats = {
  total: number;
  byOrigin: Record<CategoryOrigin, number>;
  hidden: number;
  /** Niveles usados (1 = solo raíces). */
  depth: number;
};

export function categoryTreeStats(nodes: CategoryTreeNodeDTO[]): CategoryTreeStats {
  const stats: CategoryTreeStats = { total: 0, byOrigin: { platform: 0, tenant: 0, integration: 0 }, hidden: 0, depth: 0 };
  const walk = (list: CategoryTreeNodeDTO[], level: number) => {
    for (const node of list) {
      stats.total += 1;
      stats.byOrigin[node.origin] += 1;
      if (!node.is_active) stats.hidden += 1;
      stats.depth = Math.max(stats.depth, level);
      walk(node.children ?? [], level + 1);
    }
  };
  walk(nodes, 1);
  return stats;
}

/** Sin tildes ni mayúsculas: «Serum» encuentra «Sérums». */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Busca en TODO el árbol, también dentro de las ramas plegadas (antes solo en
 * lo visible, inventario D.1 #22), por nombre o por sinónimo. Devuelve el árbol
 * podado a las coincidencias con sus ancestros, y los ids a desplegar para que
 * cada coincidencia quede a la vista.
 */
export function searchCategoryTree(
  nodes: CategoryTreeNodeDTO[],
  query: string,
): { nodes: CategoryTreeNodeDTO[]; expand: Set<string>; matches: number } {
  const needle = normalize(query);
  const expand = new Set<string>();
  let matches = 0;
  if (needle === "") return { nodes, expand, matches: 0 };
  const prune = (list: CategoryTreeNodeDTO[]): CategoryTreeNodeDTO[] =>
    list.flatMap((node) => {
      const hit =
        normalize(node.name).includes(needle) || node.search_aliases.some((alias) => normalize(alias).includes(needle));
      const children = prune((node.children ?? []) as CategoryTreeNodeDTO[]);
      if (hit) matches += 1;
      if (!hit && children.length === 0) return [];
      if (children.length > 0) expand.add(node.id);
      return [{ ...node, children }];
    });
  return { nodes: prune(nodes), expand, matches };
}
