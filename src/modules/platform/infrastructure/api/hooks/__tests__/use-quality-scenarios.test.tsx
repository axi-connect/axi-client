import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { platformKeys } from "../../query-keys";
import { platformClient } from "../../platform-client";
import {
  useArchiveScenario,
  useCloneScenario,
  useCreateScenario,
  useScenariosQuery,
} from "../use-quality-scenarios";
import { useSetSuiteScenarios, useSuitesQuery } from "../use-quality-suites";

const SCENARIOS_PAGE = {
  data: [
    {
      id: "s-1",
      code: "buyer_multi_product",
      name: "Comprador multiproducto",
      is_system: true,
      status: "active",
      success_criteria: [{ kind: "order_created", min_items: 5 }],
      tags: ["ventas"],
    },
  ],
  meta: { total: 1, page: 1, page_size: 25 },
};

jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(async () => ({ data: SCENARIOS_PAGE })),
    POST: jest.fn(async () => ({ data: { id: "s-new" } })),
    PATCH: jest.fn(async () => ({})),
    PUT: jest.fn(async () => ({})),
    DELETE: jest.fn(async () => ({})),
  },
}));

const mockedClient = platformClient as jest.Mocked<typeof platformClient>;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useScenariosQuery", () => {
  it("traduce los filtros al query (is_system como STRING) y pagina en server", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useScenariosQuery({ status: "active", isSystem: true, search: "buyer", page: 2, pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenCalledWith("/api/v1/platform/quality/scenarios", {
      params: {
        query: { status: "active", is_system: "true", search: "buyer", page: 2, page_size: 25 },
      },
    });
    expect(result.current.data?.meta.total).toBe(1);
  });

  it("omite filtros vacíos y normaliza el search en la key (caché por combinación)", async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(
      () => useScenariosQuery({ search: "   ", page: 1, pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/scenarios", {
      params: { query: { page: 1, page_size: 25 } },
    });
    const key = platformKeys.quality.scenarios.list({
      status: null,
      is_system: null,
      search: null,
      page: 1,
      page_size: 25,
    });
    expect(queryClient.getQueryData(key)).toBeDefined();
  });
});

describe("mutaciones de escenarios", () => {
  it("crear / clonar / archivar invalidan quality.scenarios.all", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const create = renderHook(() => useCreateScenario(), { wrapper });
    await waitFor(async () => {
      const created = await create.result.current.mutateAsync({
        code: "mi_escenario",
        name: "Mi escenario",
        persona: "cliente impaciente…",
        goal: "comprar dos productos",
        max_turns: 12,
        tags: [],
        success_criteria: [{ kind: "order_created" }],
      });
      expect(created.id).toBe("s-new");
    });

    const clone = renderHook(() => useCloneScenario(), { wrapper });
    await waitFor(async () => {
      await clone.result.current.mutateAsync({ id: "s-1", body: { code: "mi_variante" } });
    });

    const archive = renderHook(() => useArchiveScenario(), { wrapper });
    await waitFor(async () => {
      await archive.result.current.mutateAsync("s-1");
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(3);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: platformKeys.quality.scenarios.all });
  });
});

describe("hooks de suites", () => {
  it("useSuitesQuery pagina en server con filtros en la key", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSuitesQuery({ page: 1, pageSize: 25 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/suites", {
      params: { query: { page: 1, page_size: 25 } },
    });
  });

  it("useSetSuiteScenarios hace PUT de reemplazo total e invalida suites.all", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSetSuiteScenarios(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync({ id: "su-1", scenarioIds: ["s-1", "s-2"] });
    });

    expect(mockedClient.PUT).toHaveBeenCalledWith("/api/v1/platform/quality/suites/{id}/scenarios", {
      params: { path: { id: "su-1" } },
      body: { scenario_ids: ["s-1", "s-2"] },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: platformKeys.quality.suites.all });
  });
});
