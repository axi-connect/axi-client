import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { platformKeys } from "../../query-keys";
import { useCreateTenant, useTenantQuery, useTenantsQuery } from "../use-tenants";

const TENANTS = {
  data: [
    { id: "t-1", name: "Acme Corp", nit: "900123456", status: "active", city: "Bogotá", country_code: "CO", users_count: 12, created_at: "2026-06-12T00:00:00Z" },
    { id: "t-2", name: "Beta Foods", nit: "901987654", status: "trial", city: null, country_code: "MX", users_count: 3, created_at: "2026-07-10T00:00:00Z" },
  ],
  meta: { total: 2 },
};

jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(async () => ({ data: TENANTS })),
    POST: jest.fn(async () => ({ data: { id: "t-3", owner_user_id: "u-9" } })),
    PATCH: jest.fn(async () => ({})),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("hooks de tenants", () => {
  it("useTenantsQuery entrega la lista completa", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.meta.total).toBe(2);
  });

  it("useTenantQuery deriva el tenant por id desde la MISMA caché de la lista", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantQuery("t-2"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("Beta Foods");
  });

  it("useTenantQuery devuelve null si el id no existe", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantQuery("no-such"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("useCreateTenant invalida el recurso tenants al crear", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateTenant(), { wrapper });

    await waitFor(async () => {
      const created = await result.current.mutateAsync({
        company: { name: "Nueva", nit: "1", country_code: "CO", currency: "COP" },
        owner: { name: "Ana", email: "ana@n.co", password: "x".repeat(12) },
      });
      expect(created.id).toBe("t-3");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: platformKeys.tenants.all });
  });
});
