import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { platformKeys } from "../../query-keys";
import { platformClient } from "../../platform-client";
import { useCancelRun, useCreateRun, useRunsQuery } from "../use-quality-runs";

const RUNS_PAGE = {
  data: [
    {
      id: "r-1",
      company_id: "t-1",
      company_name: "Acme",
      kind: "qa",
      status: "completed",
      ai_mode: null,
      params: { concurrency: 4 },
      cases_total: 7,
      cases_passed: 6,
      cases_failed: 1,
      cases_blocked: 0,
      avg_judge_score: 82.5,
      metrics: null,
      spend_usd: 0.04,
      error: null,
      suite: { code: "basic_smoke", name: "Smoke básico" },
      target_agent: { name: "Sofía", model: "gpt-4o", provider: "openai_compatible" },
      created_by: "u-1",
      started_at: null,
      finished_at: null,
      created_at: "2026-08-03T00:00:00Z",
      updated_at: "2026-08-03T00:00:00Z",
    },
  ],
  meta: { total: 1, page: 1, page_size: 25 },
};

jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(async () => ({ data: RUNS_PAGE })),
    POST: jest.fn(async () => ({ data: { id: "r-new" } })),
  },
}));

jest.mock("../../../auth/platform-auth.context", () => ({
  usePlatformAuth: () => ({ reloginOpen: false }),
}));

const mockedClient = platformClient as jest.Mocked<typeof platformClient>;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("useRunsQuery", () => {
  it("traduce los filtros al query y pagina en server", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRunsQuery({ companyId: "t-1", kind: "qa", status: "completed", page: 2, pageSize: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenCalledWith("/api/v1/platform/quality/runs", {
      params: {
        query: { company_id: "t-1", kind: "qa", status: "completed", page: 2, page_size: 25 },
      },
    });
    expect(result.current.data?.meta.total).toBe(1);
  });
});

describe("useCreateRun", () => {
  it("devuelve el 202 {id} e invalida quality.runs.all", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateRun(), { wrapper });

    await waitFor(async () => {
      const created = await result.current.mutateAsync({
        company_id: "t-1",
        kind: "qa",
        agent_id: "a-1",
        suite_id: "su-1",
        concurrency: 4,
      });
      expect(created.id).toBe("r-new");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: platformKeys.quality.runs.all });
  });

  it("propaga el HttpError de negocio con su problem intacto (para details)", async () => {
    const problem = {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      code: "quality/tenant_not_eligible",
      details: { reason: "agent_not_active", agent_id: "a-1" },
    };
    mockedClient.POST.mockRejectedValueOnce(
      new HttpError({
        status: 409,
        code: "quality/tenant_not_eligible",
        message: "Conflict",
        problem: problem as never,
      }),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateRun(), { wrapper });

    await expect(
      result.current.mutateAsync({ company_id: "t-1", kind: "qa", agent_id: "a-1", suite_id: "su-1" }),
    ).rejects.toMatchObject({
      code: "quality/tenant_not_eligible",
      problem: { details: { reason: "agent_not_active" } },
    });
  });
});

describe("useCancelRun", () => {
  it("hace POST /cancel e invalida quality.runs.all", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCancelRun(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync("r-1");
    });

    expect(mockedClient.POST).toHaveBeenCalledWith("/api/v1/platform/quality/runs/{id}/cancel", {
      params: { path: { id: "r-1" } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: platformKeys.quality.runs.all });
  });
});
