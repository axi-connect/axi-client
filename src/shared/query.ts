/**
 * Utilities to build standardized list/query params for server requests.
*/

export type SortDirection = "asc" | "desc";

export type ListQueryBase<TSearchField extends string = string> = (
  Record<string, string | number | boolean | undefined>
) & {
  limit?: number
  offset?: number
  sortBy?: string
  sortDir?: SortDirection
} & Partial<Record<TSearchField, string>>

export type BuildListParamsOptions<TSearchField extends string> = {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: SortDirection
  searchField?: TSearchField
  searchValue?: string
  extra?: Record<string, unknown>
}

/**
 * Builds list params with pagination, sorting and optional search.
 * Keeps unknown extras to allow module-specific params like `view`.
*/
export function buildListParams<TSearchField extends string = string>(opts: BuildListParamsOptions<TSearchField>): ListQueryBase<TSearchField> {
  const { page, pageSize, sortBy, sortDir, searchField, searchValue, extra } = opts
  const params: Record<string, string | number | boolean | undefined> = {
    limit: pageSize,
    offset: Math.max(0, (page - 1) * pageSize),
    sortBy,
    sortDir,
    ...(extra || {}),
  }

  if (searchValue && searchField) {
    (params as any)[searchField] = searchValue
  }

  return params as ListQueryBase<TSearchField>
}