import { downloadConversationReport, parseContentDispositionFilename } from "../quality-report";

jest.mock("../../auth/token-storage", () => ({
  getPlatformToken: () => "tok-123",
}));

describe("parseContentDispositionFilename", () => {
  it("extrae filename entre comillas, sin comillas y en variante UTF-8", () => {
    expect(
      parseContentDispositionFilename('attachment; filename="conversation-debug-abc.md"'),
    ).toBe("conversation-debug-abc.md");
    expect(parseContentDispositionFilename("attachment; filename=reporte.json")).toBe("reporte.json");
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''reporte%20final.md"),
    ).toBe("reporte final.md");
  });

  it("header ausente o sin filename → null", () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename("inline")).toBeNull();
  });
});

describe("downloadConversationReport", () => {
  const originalFetch = global.fetch;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:mock");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("manda el Bearer por HEADER (jamás en la URL) y los booleanos como string", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      headers: new Headers({ "Content-Disposition": 'attachment; filename="x.md"' }),
      blob: async () => new Blob(["# reporte"]),
    }));
    global.fetch = fetchMock as never;

    await downloadConversationReport({
      companyId: "t-1",
      conversationId: "c-1",
      format: "md",
      includeRaw: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/platform/quality/debug/t-1/conversations/c-1/report");
    expect(url).toContain("format=md");
    expect(url).toContain("include_raw=true");
    expect(url).not.toContain("tok-123");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("respuesta !ok → lanza HttpError parseado (no descarga vacía)", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/problem+json" }),
      // parseHttpError lee el body con res.text().
      text: async () =>
        JSON.stringify({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          code: "quality/conversation_not_found",
        }),
    })) as never;

    await expect(
      downloadConversationReport({
        companyId: "t-1",
        conversationId: "nope",
        format: "json",
        includeRaw: false,
      }),
    ).rejects.toMatchObject({ code: "quality/conversation_not_found" });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
