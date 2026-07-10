/**
 * Utilidades para construir query params de listados contra el backend.
 *
 * El backend pagina por offset con `page` / `page_size` (default 25, máx 100)
 * y no soporta ordenamiento server-side; el orden es responsabilidad de la UI.
 * La búsqueda es por parámetro específico del recurso (p.ej. `q` en contacts).
 */
export type SelectOption = { id: string | number; label: string };

export type ListQuery = Record<string, string | number | boolean | undefined> & {
  page?: number;
  page_size?: number;
};

export type BuildListParamsOptions<TSearchField extends string> = {
  page: number;
  pageSize: number;
  searchField?: TSearchField;
  searchValue?: string;
  /** Filtros específicos del recurso (`status`, `mode`, `channel_id`, …). */
  extra?: Record<string, unknown>;
};

export function buildListParams<TSearchField extends string = string>(
  opts: BuildListParamsOptions<TSearchField>,
): ListQuery {
  const { page, pageSize, searchField, searchValue, extra } = opts;
  const params: ListQuery = {
    page: Math.max(1, page),
    page_size: pageSize,
    ...(extra as ListQuery | undefined),
  };

  if (searchValue && searchField) {
    params[searchField] = searchValue;
  }

  return params;
}
