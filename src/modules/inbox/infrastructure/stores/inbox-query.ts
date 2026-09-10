import { serializeFilters, type FilterValues } from "@/shared/components/features/filter-panel"
import { viewToQuery, type InboxSort, type InboxView } from "@/modules/inbox/domain/inbox"
import { INBOX_FILTERS_BASE } from "./inbox-filters.base"

export const INBOX_PAGE_SIZE = 25
/** Tope del backend para `page_size`; acota la ventana del refresco en vivo. */
export const INBOX_REFRESH_MAX_PAGE_SIZE = 100
/**
 * Filas cargadas como máximo por scroll infinito. Sin virtualización 500 filas
 * de DOM ligero van bien; más allá el pie pide refinar la búsqueda.
 */
export const INBOX_MAX_LOADED = 500

export type InboxQueryParams = Record<string, string | number | boolean | undefined>

export interface InboxQueryInput {
  view: InboxView
  sort: InboxSort
  q: string
  filters: FilterValues
  page: number
  pageSize?: number
}

/**
 * Estado de la lista → parámetros de `GET /inbox/conversations`. Puro y
 * testeable. Orden de precedencia: los filtros primero y la VISTA después,
 * para que un `status` colado en los filtros nunca pise a «Cerradas».
 */
export function buildInboxQuery(input: InboxQueryInput): InboxQueryParams {
  const q = input.q.trim()
  return {
    ...serializeFilters(INBOX_FILTERS_BASE, input.filters),
    ...viewToQuery(input.view),
    sort: input.sort,
    ...(q.length > 0 ? { q } : {}),
    page: input.page,
    page_size: input.pageSize ?? INBOX_PAGE_SIZE,
  }
}

/**
 * Identidad de «qué lista estoy mirando», sin la página: cambiarla reinicia la
 * paginación y descarta respuestas en vuelo de la lista anterior.
 */
export function inboxQueryKey(input: Omit<InboxQueryInput, "page" | "pageSize">): string {
  const params = buildInboxQuery({ ...input, page: 1 })
  delete params.page
  delete params.page_size
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&")
}
