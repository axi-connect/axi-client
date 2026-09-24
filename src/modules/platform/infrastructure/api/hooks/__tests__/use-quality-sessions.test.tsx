import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { platformKeys } from "../../query-keys";
import { platformClient } from "../../platform-client";
import {
  dedupeOptimistic,
  useSendSessionMedia,
  useSendSessionMessage,
  useSessionQuery,
  useSessionsQuery,
} from "../use-quality-sessions";

const MESSAGE = {
  recognition: null,
  transcription: null,
  attachments: [],
  id: "0199-0001",
  direction: "inbound",
  sender_type: "contact",
  agent_id: null,
  content_type: "text",
  body: "hola",
  provider_message_id: "sim-in:1",
  status: "received",
  created_at: "2026-09-24T10:00:00.000Z",
  interactive: null,
  interactive_reply: null,
  location: null,
};

const DETAIL = {
  id: "s-1",
  company_id: "t-1",
  company_name: "Savage",
  agent: { id: "ag-1", name: "Valentina", model: "gpt-4o-mini", provider: "openai_compatible" },
  status: "active",
  ended_reason: null,
  purged: false,
  persona_note: null,
  spend: { spent_usd: 0.1, cap_usd: 1, daily_spent_usd: 0.4, daily_cap_usd: 10 },
  operator_turns: 1,
  created_by: "u-1",
  created_at: "2026-09-24T10:00:00.000Z",
  last_activity_at: "2026-09-24T10:00:00.000Z",
  finished_at: null,
  conversation_id: "c-1",
  external_id: "sim:case-1",
  agent_state: "idle",
  conversation: { mode: "ai_active", status: "open", closed_reason: null, intention: null },
  agent_of_last_turn: null,
  agent_changed: false,
  agents: [{ id: "ag-1", name: "Valentina" }],
  transcript_mode: "full",
  transcript: [MESSAGE],
};

jest.mock("../../platform-client", () => ({
  platformClient: {
    GET: jest.fn(),
    POST: jest.fn(async () => ({ data: { provider_message_id: "sim-in:2" } })),
  },
}));

jest.mock("../../../auth/platform-auth.context", () => ({
  usePlatformAuth: () => ({ reloginOpen: false }),
}));

jest.mock("../../../auth/token-storage", () => ({
  getPlatformToken: () => "tok-1",
}));

const mockedClient = platformClient as jest.Mocked<typeof platformClient>;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  mockedClient.GET.mockReset();
  mockedClient.POST.mockClear();
});

describe("useSessionsQuery", () => {
  it("traduce los filtros (mine viaja como 'true') y pagina en server", async () => {
    mockedClient.GET.mockResolvedValue({ data: { data: [], meta: { total: 0, page: 1, page_size: 20 } } } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSessionsQuery({ companyId: "t-1", status: "active", mine: true, page: 1, pageSize: 20 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenCalledWith("/api/v1/platform/quality/sessions", {
      params: { query: { company_id: "t-1", status: "active", mine: "true", page: 1, page_size: 20 } },
    });
  });
});

describe("useSessionQuery", () => {
  it("la primera lectura es completa y la siguiente pide solo el delta y lo fusiona", async () => {
    const delta = {
      ...DETAIL,
      agent_state: "idle",
      transcript_mode: "delta",
      transcript: [{ ...MESSAGE, id: "0199-0002", direction: "outbound", sender_type: "ai_agent", agent_id: "ag-1", body: "¡Hola!" }],
    };
    // La primera lectura completa; cualquier lectura posterior devuelve el delta
    mockedClient.GET.mockResolvedValueOnce({ data: DETAIL } as never).mockResolvedValue({ data: delta } as never);
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useSessionQuery("s-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: {} },
    });

    // Se asierta sobre lo que devuelve refetch y lo que queda en caché: es la
    // fuente que leen la UI y la siguiente lectura incremental
    const refetched = await act(() => result.current.refetch());
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: { after: "0199-0001" } },
    });
    expect(refetched.data?.transcript_mode).toBe("delta");
    expect(refetched.data?.transcript.map((message) => message.id)).toEqual(["0199-0001", "0199-0002"]);
    const cached = queryClient.getQueryData<typeof DETAIL>(platformKeys.quality.sessions.detail("s-1"));
    expect(cached?.transcript.map((message) => message.id)).toEqual(["0199-0001", "0199-0002"]);
  });
});

describe("useSessionQuery con medios (B2)", () => {
  it("una imagen cuyo adjunto y reconocimiento llegan en polls posteriores termina con url y chip", async () => {
    const image = { ...MESSAGE, id: "0199-0002", content_type: "image", body: null, provider_message_id: "sim-in:2" };
    const attachment = { id: "att-1", mime_type: "image/jpeg", filename: "f.jpg", size_bytes: 10, url: "https://x/1" };
    const recognition = { status: "skipped", skip_reason: "disabled", error_reason: null, kind: null, description: null, top_score: null, margin: null, degraded: false, latency_ms: null, candidates: [] };
    mockedClient.GET
      // 1) completo: la imagen recién persistida, sin adjunto ni reconocimiento
      .mockResolvedValueOnce({ data: { ...DETAIL, transcript: [MESSAGE, image] } } as never)
      // 2) delta desde el ÚLTIMO ASENTADO (el texto): la imagen vuelve con adjunto
      .mockResolvedValueOnce({ data: { ...DETAIL, transcript_mode: "delta", transcript: [{ ...image, attachments: [attachment] }] } } as never)
      // 3) y vuelve otra vez con el reconocimiento: ya asentada
      .mockResolvedValueOnce({ data: { ...DETAIL, transcript_mode: "delta", transcript: [{ ...image, attachments: [attachment], recognition }] } } as never)
      // 4) desde ahí el cursor avanza a la imagen
      .mockResolvedValue({ data: { ...DETAIL, transcript_mode: "delta", transcript: [] } } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionQuery("s-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const second = await act(() => result.current.refetch());
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: { after: "0199-0001" } },
    });
    expect(second.data?.transcript[1]?.attachments[0]?.url).toBe("https://x/1");

    const third = await act(() => result.current.refetch());
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: { after: "0199-0001" } },
    });
    expect(third.data?.transcript[1]?.recognition?.status).toBe("skipped");
    expect(third.data?.transcript).toHaveLength(2);

    await act(() => result.current.refetch());
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: { after: "0199-0002" } },
    });
  });

  it("cada 4 min vuelve a leer el transcript completo para renovar las URL presignadas", async () => {
    const now = jest.spyOn(Date, "now");
    now.mockReturnValue(1_000_000);
    mockedClient.GET.mockResolvedValue({ data: DETAIL } as never);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionQuery("s-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    now.mockReturnValue(1_000_000 + 4 * 60 * 1000);
    await act(() => result.current.refetch());
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: {} },
    });
    now.mockRestore();
  });
});

describe("useSendSessionMessage", () => {
  it("pinta la burbuja optimista con el provider_message_id del 202 y pone al agente a pensar", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(platformKeys.quality.sessions.detail("s-1"), DETAIL);
    const { result } = renderHook(() => useSendSessionMessage("s-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ kind: "text", body: "quiero tenis" });
    });
    expect(mockedClient.POST).toHaveBeenCalledWith("/api/v1/platform/quality/sessions/{id}/messages", {
      params: { path: { id: "s-1" } },
      body: { kind: "text", body: "quiero tenis" },
    });
    const cached = queryClient.getQueryData<typeof DETAIL>(platformKeys.quality.sessions.detail("s-1"));
    expect(cached?.agent_state).toBe("thinking");
    const last = cached?.transcript.at(-1);
    expect(last?.id).toBe("pending-sim-in:2");
    expect(last?.body).toBe("quiero tenis");
    expect(last?.status).toBe("queued");
  });

  it("B1: el poll siguiente al envío optimista pide after = último id PERSISTIDO y trae la respuesta", async () => {
    const reply = { ...MESSAGE, id: "0199-0003", direction: "outbound", sender_type: "ai_agent", agent_id: "ag-1", body: "¡Hola!" };
    const persistedOperator = { ...MESSAGE, id: "0199-0002", provider_message_id: "sim-in:2", body: "quiero tenis" };
    mockedClient.GET.mockResolvedValueOnce({ data: DETAIL } as never).mockResolvedValue({
      data: { ...DETAIL, transcript_mode: "delta", transcript: [persistedOperator, reply] },
    } as never);
    const { wrapper, queryClient } = createWrapper();
    const detail = renderHook(() => useSessionQuery("s-1"), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    const send = renderHook(() => useSendSessionMessage("s-1"), { wrapper });
    await act(async () => {
      await send.result.current.mutateAsync({ kind: "text", body: "quiero tenis" });
    });
    // La caché ya tiene la burbuja pending-… al final
    const before = queryClient.getQueryData<typeof DETAIL>(platformKeys.quality.sessions.detail("s-1"));
    expect(before?.transcript.at(-1)?.id).toBe("pending-sim-in:2");

    const refetched = await act(() => detail.result.current.refetch());
    // NUNCA `after=pending-…` (el server valida uuid y respondía 400)
    expect(mockedClient.GET).toHaveBeenLastCalledWith("/api/v1/platform/quality/sessions/{id}", {
      params: { path: { id: "s-1" }, query: { after: "0199-0001" } },
    });
    // La persistida y la respuesta del agente llegan; la optimista se deduplica al pintar
    const ids = dedupeOptimistic(refetched.data?.transcript ?? []).map((message) => message.id);
    expect(ids).toEqual(["0199-0001", "0199-0002", "0199-0003"]);
  });

  it("dedupeOptimistic descarta la burbuja provisional cuando llega la persistida", () => {
    const pending = { ...MESSAGE, id: "pending-sim-in:2", provider_message_id: "sim-in:2", status: "queued" };
    const persisted = { ...MESSAGE, id: "0199-0002", provider_message_id: "sim-in:2" };
    expect(dedupeOptimistic([MESSAGE, pending] as never).map((m) => m.id)).toEqual(["0199-0001", "pending-sim-in:2"]);
    expect(dedupeOptimistic([MESSAGE, pending, persisted] as never).map((m) => m.id)).toEqual(["0199-0001", "0199-0002"]);
  });

describe("useSendSessionMedia (F2)", () => {
  it("sube multipart con Bearer y pinta la burbuja optimista de imagen reconciliable por provider_message_id", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ provider_message_id: "sim-in:9" }),
    }));
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(platformKeys.quality.sessions.detail("s-1"), DETAIL);
    const { result } = renderHook(() => useSendSessionMedia("s-1"), { wrapper });
    const file = new Blob(["png"], { type: "image/png" });

    await act(async () => {
      await result.current.mutateAsync({ file, filename: "foto.png", caption: "¿este?" });
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/platform/quality/sessions/s-1/media");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("caption")).toBe("¿este?");

    const cached = queryClient.getQueryData<typeof DETAIL>(platformKeys.quality.sessions.detail("s-1"));
    const last = cached?.transcript.at(-1);
    expect(last?.id).toBe("pending-sim-in:9");
    expect(last?.content_type).toBe("image");
    expect(last?.provider_message_id).toBe("sim-in:9");
    expect(cached?.agent_state).toBe("thinking");
    // Al llegar la persistida con el mismo provider_message_id, la optimista se va
    const persisted = { ...MESSAGE, id: "0199-0009", content_type: "image", provider_message_id: "sim-in:9" };
    expect(dedupeOptimistic([...(cached?.transcript ?? []), persisted] as never).map((m) => m.id)).toEqual(["0199-0001", "0199-0009"]);
  });
});
});
