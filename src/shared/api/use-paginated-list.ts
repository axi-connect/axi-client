import { buildListParams, SortDirection } from "./query";
import type { ApiResponse } from "../../core/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type Fetcher<TData, TParams extends Record<string, unknown>> = (params: TParams) => Promise<ApiResponse<TData>>;

export type UsePaginatedListOptions<TData, TItem, TSearchField extends string, TParams extends Record<string, unknown>> = {
  fetcher: Fetcher<TData, TParams>;
  getItems: (data: TData) => TItem[];
  getTotal: (data: TData) => number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDirection;
  searchField?: TSearchField;
  extraParams?: Partial<TParams>;
};

export function usePaginatedList<
  TData,
  TItem,
  TSearchField extends string = string,
  TParams extends Record<string, unknown> = Record<string, unknown>
>(options: UsePaginatedListOptions<TData, TItem, TSearchField, TParams>) {
  const { fetcher, getItems, getTotal, pageSize = 20, sortBy, sortDir, searchField, extraParams } = options;

  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSizeState, setPageSize] = useState<number>(pageSize);
  const [sortByState, setSortBy] = useState<string | undefined>(sortBy);
  const [sortDirState, setSortDir] = useState<SortDirection | undefined>(sortDir);
  const [searchValue, setSearchValue] = useState<string | undefined>(undefined);

  const params = useMemo(() => {
    return buildListParams({
      page,
      pageSize: pageSizeState,
      sortBy: sortByState,
      sortDir: sortDirState,
      searchField: searchField as TSearchField | undefined,
      searchValue,
      extra: extraParams as Record<string, unknown>,
    }) as unknown as TParams;
  }, [page, pageSizeState, sortByState, sortDirState, searchField, searchValue, extraParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetcher(params);
      setItems(getItems(response.data));
      setTotal(getTotal(response.data));
    } catch (err) {
      setError((err as Error)?.message || "Error fetching list");
    } finally {
      setLoading(false);
    }
  }, [fetcher, getItems, getTotal, params]);

  useEffect(() => {
    // Auto refresh when query state changes
    refresh();
  }, [refresh]);

  const canPrev = page > 1;
  const canNext = page * pageSizeState < total;

  const nextPage = useCallback(() => {
    if (canNext) setPage(prev => prev + 1);
  }, [canNext]);

  const prevPage = useCallback(() => {
    if (canPrev) setPage(prev => Math.max(1, prev - 1));
  }, [canPrev]);

  const setSort = useCallback((by?: string, dir?: SortDirection) => {
    setSortBy(by);
    setSortDir(dir);
    setPage(1);
  }, []);

  const setSearch = useCallback((value?: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setPageSizeSafe = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    // data
    items,
    total,
    loading,
    error,
    // query state
    page,
    pageSize: pageSizeState,
    sortBy: sortByState,
    sortDir: sortDirState,
    searchValue,
    // controls
    canNext,
    canPrev,
    nextPage,
    prevPage,
    setPage,
    setPageSize: setPageSizeSafe,
    setSort,
    setSearch,
    refresh,
    // raw params (if needed by consumers)
    params,
  } as const;
}