/**
 * Buscar, ordenar y paginar una colección pequeña que ya está en memoria
 * (tipos de producto, catálogos). Catálogo premium F4: antes el `DataTable`
 * marcaba columnas «ordenables» que no ordenaban, no tenía buscador y sin
 * paginador el 11.º en adelante no se veía (inventario D.1 #20). TS puro.
 */

export const LOCAL_PAGE_SIZE = 10;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type LocalListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};

export function localList<T>(
  all: readonly T[],
  {
    query,
    searchIn,
    compare,
    page,
    pageSize = LOCAL_PAGE_SIZE,
  }: {
    query: string;
    /** Los textos donde se busca (nombre, código, descripción…). */
    searchIn: (item: T) => (string | null | undefined)[];
    compare: (a: T, b: T) => number;
    page: number;
    pageSize?: number;
  },
): LocalListResult<T> {
  const needle = normalize(query);
  const matched =
    needle === ""
      ? [...all]
      : all.filter((item) => searchIn(item).some((text) => text != null && normalize(text).includes(needle)));
  matched.sort(compare);
  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: matched.slice((current - 1) * pageSize, current * pageSize),
    total: matched.length,
    page: current,
    pages,
  };
}

/** Orden alfabético en español (tildes y mayúsculas no cuentan). */
export const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, "es", { sensitivity: "base" });

/** Lo más reciente primero. */
export const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);
