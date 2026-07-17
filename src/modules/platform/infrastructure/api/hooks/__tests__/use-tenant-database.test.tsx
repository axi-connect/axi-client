import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { useTenantDatabaseQuery } from "../use-tenant-database";

const getMock = jest.fn();
jest.mock("../../platform-client", () => ({
  platformClient: { GET: (...args: unknown[]) => getMock(...args) },
}));

jest.mock("../../../auth/platform-auth.context", () => ({
  usePlatformAuth: () => ({ reloginOpen: false }),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

describe("useTenantDatabaseQuery", () => {
  beforeEach(() => getMock.mockReset());

  it("404 tenant_db/not_found → data null SIN error (sin configurar)", async () => {
    getMock.mockRejectedValueOnce(
      new HttpError({ status: 404, code: "tenant_db/not_found", message: "not found" }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantDatabaseQuery("t-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("otros errores SÍ se propagan (isError)", async () => {
    getMock.mockRejectedValueOnce(
      new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantDatabaseQuery("t-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("DB configurada → entrega la vista tal cual", async () => {
    getMock.mockResolvedValueOnce({
      data: { id: "d-1", status: "active", host: "db.internal" },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantDatabaseQuery("t-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ status: "active" });
    expect(result.current.pollDegraded).toBe(false);
  });
});
