"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildListParams, type ListQuery } from "./query";
import { HttpError, isHttpError } from "@/core/api/problem";
import type { OffsetMeta } from "@/core/api/types";

/**
 * Hook de listado server-side sobre el contrato del backend:
 * `{ data: T[], meta: { total, page, page_size } }` con query `page`/`page_size`.
 *
 * También acepta colecciones no paginadas (`{ data }` o `{ data, meta: { total } }`):
 * en ese caso `total` cae a `data.length` y la paginación queda inerte.
 * Reutilizar SIEMPRE para tablas en lugar de reimplementar estado de listado.
 */
export type ListResult<TItem> = {
  data: TItem[];
  meta?: Partial<OffsetMeta>;
};

export type UsePaginatedListOptions<TItem, TSearchField extends string = string> = {
  fetcher: (params: ListQuery) => Promise<ListResult<TItem>>;
  pageSize?: number;
  searchField?: TSearchField;
  /** Filtros específicos del recurso; cambiarlos reinicia a la página 1. */
  extraParams?: Record<string, unknown>;
};

export function usePaginatedList<TItem, TSearchField extends string = string>(
  options: UsePaginatedListOptions<TItem, TSearchField>,
) {
  const { fetcher, pageSize = 25, searchField, extraParams } = options;

  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<HttpError | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSizeState, setPageSizeState] = useState<number>(pageSize);
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);

  const params = useMemo(
    () =>
      buildListParams({
        page,
        pageSize: pageSizeState,
        searchField,
        searchValue,
        extra: extraParams,
      }),
    [page, pageSizeState, searchField, searchValue, extraParams],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
    } catch (err) {
      setError(
        isHttpError(err)
          ? err
          : new HttpError({
              status: 0,
              code: "client/network",
              message: err instanceof Error ? err.message : "Error de red",
            }),
      );
    } finally {
      setLoading(false);
    }
  }, [fetcher, params]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canPrev = page > 1;
  const canNext = page * pageSizeState < total;

  const nextPage = useCallback(() => {
    setPage((prev) => (prev * pageSizeState < total ? prev + 1 : prev));
  }, [pageSizeState, total]);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const setSearch = useCallback((value?: string) => {
    setSearchValue(value || undefined);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    // datos
    items,
    total,
    loading,
    error,
    // estado de query
    page,
    pageSize: pageSizeState,
    searchValue,
    // controles
    canNext,
    canPrev,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
    setSearch,
    refresh,
    // params crudos por si el consumidor los necesita
    params,
  } as const;
}
