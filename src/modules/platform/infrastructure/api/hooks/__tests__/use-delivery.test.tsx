import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { DeliveryDraftWire } from "../../delivery.dto";
import { useCreateDelivery, useDebouncedValue, useDeliveryPreview } from "../use-delivery";
import { platformKeys } from "../../query-keys";

const PREVIEW = {
  blockers: [],
  warnings: [],
  kit_data: {},
  email_html_owner: "<p>dueño</p>",
  email_html_team: "<p>equipo</p>",
  subject: "Bienvenido",
};

jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(),
    POST: jest.fn(async (path: string) =>
      path.endsWith("/delivery/preview")
        ? { data: PREVIEW }
        : { data: { delivery_id: "d-1", status: "committed" } },
    ),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { platformClient } = require("../../platform-client") as { platformClient: { POST: jest.Mock } };

function draft(name: string): DeliveryDraftWire {
  return {
    offer: { package_code: "crecimiento", billing_period: "monthly" },
    restart_trial: true,
    session_date: "2026-09-24",
    call_day2_at: "2026-09-28T10:00:00-05:00",
    call_day5_at: "2026-09-29T10:00:00-05:00",
    digest_time: "07:30",
    advisor: { name, whatsapp_e164: "+573004821937", email: "camila@axi-connect.co" },
    cc: [],
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const previewCalls = () => platformClient.POST.mock.calls.filter(([path]) => String(path).endsWith("/preview"));

beforeEach(() => platformClient.POST.mockClear());
afterEach(() => jest.useRealTimers());

describe("useDebouncedValue", () => {
  it("entrega el valor solo cuando deja de cambiar; un objeto igual no reinicia la espera", () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: { a: 1 } },
    });
    expect(result.current).toEqual({ a: 1 });

    rerender({ value: { a: 2 } });
    act(() => jest.advanceTimersByTime(300));
    rerender({ value: { a: 3 } });
    act(() => jest.advanceTimersByTime(300));
    expect(result.current).toEqual({ a: 1 });

    rerender({ value: { a: 3 } });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toEqual({ a: 3 });
  });
});

describe("useDeliveryPreview", () => {
  it("una sola llamada por pausa, con el último borrador, no una por tecla", async () => {
    jest.useFakeTimers();
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(({ value }) => useDeliveryPreview("t-1", value, 700), {
      wrapper,
      initialProps: { value: null as DeliveryDraftWire | null },
    });
    expect(previewCalls()).toHaveLength(0);

    for (const name of ["C", "Ca", "Cam", "Cami", "Camila"]) {
      rerender({ value: draft(name) });
      act(() => jest.advanceTimersByTime(150));
    }
    expect(previewCalls()).toHaveLength(0);
    expect(result.current.settling).toBe(true);

    act(() => jest.advanceTimersByTime(700));
    jest.useRealTimers();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(previewCalls()).toHaveLength(1);
    const [path, init] = previewCalls()[0];
    expect(path).toBe("/api/v1/platform/tenants/{id}/delivery/preview");
    expect(init.params.path.id).toBe("t-1");
    expect(init.body.advisor.name).toBe("Camila");
    expect(result.current.data?.email_html_owner).toBe("<p>dueño</p>");
    await waitFor(() => expect(result.current.upToDate).toBe(true));
  });

  it("sin borrador no llama", () => {
    const { wrapper } = createWrapper();
    renderHook(() => useDeliveryPreview("t-1", null, 0), { wrapper });
    expect(previewCalls()).toHaveLength(0);
  });
});

describe("useCreateDelivery", () => {
  it("envía la clave de idempotencia tal cual e invalida la entrega y la lista de tenants", async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateDelivery("t-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ...draft("Camila"), idempotency_key: "clave-estable-1" });
    });

    const [, init] = platformClient.POST.mock.calls.at(-1)!;
    expect(init.body.idempotency_key).toBe("clave-estable-1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformKeys.delivery.all("t-1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: platformKeys.tenants.all });
  });
});
