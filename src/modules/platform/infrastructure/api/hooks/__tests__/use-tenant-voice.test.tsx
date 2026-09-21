import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { platformKeys } from "../../query-keys";
import { useRemoveTenantVoiceCredential, useSetTenantVoiceCredential, useSetTenantVoiceEnabled, useTenantVoiceQuery } from "../use-tenant-voice";

const VOICE = {
  ai_enabled: false,
  plan: { code: "sbs", tier: "sbs" },
  credential: { configured: false, provider: "elevenlabs" },
  usage: { used: 0, limit: null, pct_used: null, period_end: "2026-09-30T05:00:00.000Z" },
};

const GET = jest.fn(async () => ({ data: VOICE }));
const PUT = jest.fn(async () => ({}));
const DELETE = jest.fn(async () => ({}));
jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: (...args: unknown[]) => GET(...(args as [])),
    PUT: (...args: unknown[]) => PUT(...(args as [])),
    DELETE: (...args: unknown[]) => DELETE(...(args as [])),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, wrapper };
}

describe("hooks de voz del tenant (consola)", () => {
  beforeEach(() => {
    GET.mockClear();
    PUT.mockClear();
    DELETE.mockClear();
  });

  it("useTenantVoiceQuery lee GET /platform/tenants/{id}/voice", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTenantVoiceQuery("t-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(VOICE);
    expect(GET).toHaveBeenCalledWith("/api/v1/platform/tenants/{id}/voice", { params: { path: { id: "t-1" } } });
  });

  it("encender, guardar llave y quitar llave pegan a sus rutas e invalidan la lectura", async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => ({
        enable: useSetTenantVoiceEnabled("t-1"),
        setKey: useSetTenantVoiceCredential("t-1"),
        removeKey: useRemoveTenantVoiceCredential("t-1"),
      }),
      { wrapper },
    );

    await result.current.enable.mutateAsync(true);
    expect(PUT).toHaveBeenCalledWith("/api/v1/platform/tenants/{id}/voice/settings", { params: { path: { id: "t-1" } }, body: { ai_enabled: true } });

    await result.current.setKey.mutateAsync("sk-el-tenant-key-1234567890");
    expect(PUT).toHaveBeenCalledWith("/api/v1/platform/tenants/{id}/voice/credential", { params: { path: { id: "t-1" } }, body: { api_key: "sk-el-tenant-key-1234567890" } });

    await result.current.removeKey.mutateAsync();
    expect(DELETE).toHaveBeenCalledWith("/api/v1/platform/tenants/{id}/voice/credential", { params: { path: { id: "t-1" } } });

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformKeys.tenants.voice("t-1") });
  });
});
