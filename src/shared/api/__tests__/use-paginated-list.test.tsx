import { act, renderHook, waitFor } from "@testing-library/react";
import { usePaginatedList } from "../use-paginated-list";
import { buildListParams } from "../query";
import type { ListResult } from "../use-paginated-list";

describe("buildListParams", () => {
  it("construye page/page_size con búsqueda y extras", () => {
    const params = buildListParams({
      page: 3,
      pageSize: 10,
      searchField: "q",
      searchValue: "ana",
      extra: { lifecycle_stage: "lead" },
    });

    expect(params).toEqual({ page: 3, page_size: 10, q: "ana", lifecycle_stage: "lead" });
  });

  it("omite la búsqueda sin valor y normaliza la página mínima a 1", () => {
    const params = buildListParams({ page: 0, pageSize: 25, searchField: "q" });
    expect(params).toEqual({ page: 1, page_size: 25 });
  });
});

describe("usePaginatedList", () => {
  type Item = { id: string; name: string };

  it("carga la primera página del contrato { data, meta }", async () => {
    const fetcher = jest.fn(async (): Promise<ListResult<Item>> => ({
      data: [{ id: "1", name: "uno" }],
      meta: { total: 30, page: 1, page_size: 25 },
    }));

    const { result } = renderHook(() => usePaginatedList<Item>({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 25 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(30);
    expect(result.current.canNext).toBe(true);
    expect(result.current.canPrev).toBe(false);
  });

  it("acepta colecciones sin meta (total = data.length, paginación inerte)", async () => {
    const fetcher = jest.fn(async (): Promise<ListResult<Item>> => ({
      data: [
        { id: "1", name: "uno" },
        { id: "2", name: "dos" },
      ],
    }));

    const { result } = renderHook(() => usePaginatedList<Item>({ fetcher, pageSize: 25 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(2);
    expect(result.current.canNext).toBe(false);
  });

  it("avanza de página y resetea a 1 al buscar", async () => {
    const fetcher = jest.fn(async (params: Record<string, unknown>): Promise<ListResult<Item>> => ({
      data: [],
      meta: { total: 100, page: Number(params.page), page_size: 25 },
    }));

    const { result } = renderHook(() => usePaginatedList<Item, "q">({ fetcher, searchField: "q" }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.page).toBe(2));
    expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    act(() => result.current.setSearch("ana"));
    await waitFor(() => expect(result.current.page).toBe(1));
    expect(fetcher).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: "ana" }));
  });

  it("expone HttpError de red normalizado", async () => {
    const fetcher = jest.fn(async (): Promise<ListResult<Item>> => {
      throw new Error("fetch failed");
    });

    const { result } = renderHook(() => usePaginatedList<Item>({ fetcher }));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.code).toBe("client/network");
    expect(result.current.items).toEqual([]);
  });
});
