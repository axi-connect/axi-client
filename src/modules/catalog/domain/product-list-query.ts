import type { ListProductsParams, ProductKind } from "./product";

/**
 * El estado del listado de productos vive en la URL (catálogo premium F2): la
 * búsqueda, los filtros y la página se comparten con un enlace, sobreviven a
 * volver del detalle y la isla «Lo próximo» abre el listado ya filtrado. Antes
 * vivían en `useState` y se perdían al salir. TS puro.
 */

export const PRODUCT_STOCK_FILTERS = ["ok", "low", "out", "untracked"] as const;
export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTERS)[number];

export const PRODUCT_ENRICHMENT_FILTERS = ["pending", "ready", "failed", "disabled", "none"] as const;
export type ProductEnrichmentFilter = (typeof PRODUCT_ENRICHMENT_FILTERS)[number];

export type ProductListQuery = {
  q?: string;
  catalog_id?: string;
  category_id?: string;
  kind?: ProductKind;
  is_active?: boolean;
  has_images?: boolean;
  stock_state?: ProductStockFilter;
  uncategorized?: boolean;
  enrichment_status?: ProductEnrichmentFilter;
  page: number;
};

/** Lo que se filtra (todo menos `q` y `page`). */
export type ProductListFilters = Omit<ProductListQuery, "q" | "page">;
export type ProductListFilterKey = keyof ProductListFilters;

type ReadableParams = { get: (name: string) => string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function oneOf<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  return value !== null && (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

function bool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function uuid(value: string | null): string | undefined {
  return value !== null && UUID.test(value) ? value : undefined;
}

/**
 * Lee la URL tolerando lo que no entiende: un valor inválido se ignora (no
 * rompe la vista ni llega al backend como un 400). Una URL vieja o editada a
 * mano abre el listado sin ese filtro.
 */
export function parseProductListQuery(params: ReadableParams): ProductListQuery {
  const q = params.get("q")?.trim();
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return {
    q: q ? q.slice(0, 120) : undefined,
    catalog_id: uuid(params.get("catalog_id")),
    category_id: uuid(params.get("category_id")),
    kind: oneOf(params.get("kind"), ["product", "service"] as const),
    is_active: bool(params.get("is_active")),
    has_images: bool(params.get("has_images")),
    stock_state: oneOf(params.get("stock_state"), PRODUCT_STOCK_FILTERS),
    uncategorized: bool(params.get("uncategorized")),
    enrichment_status: oneOf(params.get("enrichment_status"), PRODUCT_ENRICHMENT_FILTERS),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

const ORDER: (keyof ProductListQuery)[] = [
  "q",
  "catalog_id",
  "category_id",
  "kind",
  "is_active",
  "has_images",
  "stock_state",
  "uncategorized",
  "enrichment_status",
  "page",
];

/** La URL canónica: sin valores por omisión (página 1, sin filtro), en un orden fijo. */
export function serializeProductListQuery(query: ProductListQuery): string {
  const params = new URLSearchParams();
  for (const key of ORDER) {
    const value = query[key];
    if (value === undefined || value === "") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export function hasProductListFilters(query: ProductListQuery): boolean {
  return ORDER.some((key) => key !== "q" && key !== "page" && query[key] !== undefined);
}

/** Cambiar un filtro o la búsqueda vuelve a la página 1 (la página de antes ya no existe). */
export function withFilter<K extends ProductListFilterKey>(
  query: ProductListQuery,
  key: K,
  value: ProductListFilters[K],
): ProductListQuery {
  return { ...query, [key]: value, page: 1 };
}

export function withoutFilters(query: ProductListQuery): ProductListQuery {
  return { q: query.q, page: 1 };
}

/** Los parámetros de `GET /catalog/products` (la página y el tamaño los pone el hook). */
export function toListParams(query: ProductListQuery): Omit<ListProductsParams, "page" | "page_size" | "q"> {
  return {
    catalog_id: query.catalog_id,
    category_id: query.category_id,
    kind: query.kind,
    is_active: query.is_active,
    has_images: query.has_images,
    stock_state: query.stock_state,
    uncategorized: query.uncategorized,
    enrichment_status: query.enrichment_status,
  };
}

const STOCK_CHIPS: Record<ProductStockFilter, string> = {
  ok: "Disponibles",
  low: "Con una variante agotada",
  out: "Agotados",
  untracked: "Sin control de stock",
};

const ENRICHMENT_CHIPS: Record<ProductEnrichmentFilter, string> = {
  pending: "Búsqueda con IA generándose",
  ready: "Búsqueda con IA lista",
  failed: "Sin búsqueda con IA: no se pudo generar",
  disabled: "Búsqueda con IA desactivada",
  none: "Búsqueda con IA sin generar",
};

export type ProductFilterChip = { key: ProductListFilterKey; label: string };

/**
 * Un chip por filtro activo, con el nombre que se entiende sin abrir el
 * selector. Los nombres de catálogo y categoría los resuelve la vista (vienen
 * del contexto); sin nombre todavía, se dice qué filtra.
 */
export function productFilterChips(
  query: ProductListQuery,
  names: { catalog?: string; category?: string },
): ProductFilterChip[] {
  const chips: ProductFilterChip[] = [];
  if (query.catalog_id !== undefined) chips.push({ key: "catalog_id", label: names.catalog ?? "Un catálogo" });
  if (query.category_id !== undefined) chips.push({ key: "category_id", label: names.category ?? "Una categoría" });
  if (query.kind !== undefined) chips.push({ key: "kind", label: query.kind === "service" ? "Servicios" : "Productos" });
  if (query.is_active !== undefined) chips.push({ key: "is_active", label: query.is_active ? "Activos" : "Inactivos" });
  if (query.has_images !== undefined) chips.push({ key: "has_images", label: query.has_images ? "Con fotos" : "Sin fotos" });
  if (query.stock_state !== undefined) chips.push({ key: "stock_state", label: STOCK_CHIPS[query.stock_state] });
  if (query.uncategorized !== undefined) {
    chips.push({ key: "uncategorized", label: query.uncategorized ? "Sin categoría" : "Con categoría" });
  }
  if (query.enrichment_status !== undefined) {
    chips.push({ key: "enrichment_status", label: ENRICHMENT_CHIPS[query.enrichment_status] });
  }
  return chips;
}
