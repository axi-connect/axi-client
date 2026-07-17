/**
 * Interceptor F15 del HttpClient: un 403 `auth/company_suspended` en CUALQUIER
 * request despacha `COMPANY_SUSPENDED_EVENT` (lo escucha el AuthProvider) y
 * re-lanza el HttpError intacto. Ningún otro error despacha el evento.
 */
import { HttpClient } from "../http";
import { COMPANY_SUSPENDED_EVENT, isHttpError } from "@/core/api/problem";

/** Response mínima estilo RFC 7807 (jsdom del proyecto no trae `Response`). */
function problemResponse(status: number, code: string): Response {
  return {
    ok: false,
    status,
    statusText: "",
    headers: { get: () => null },
    text: async () => JSON.stringify({ type: "about:blank", title: "err", status, code }),
  } as unknown as Response;
}

describe("HttpClient — interceptor de empresa suspendida (F15)", () => {
  const fetchMock = jest.fn();
  let dispatched: Event[];
  let listener: (e: Event) => void;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    dispatched = [];
    listener = (e) => dispatched.push(e);
    window.addEventListener(COMPANY_SUSPENDED_EVENT, listener);
  });

  afterEach(() => {
    window.removeEventListener(COMPANY_SUSPENDED_EVENT, listener);
  });

  it("403 auth/company_suspended → despacha el evento y re-lanza el HttpError", async () => {
    fetchMock.mockResolvedValue(problemResponse(403, "auth/company_suspended"));
    const http = new HttpClient("http://backend.test");

    await expect(http.get("/conversations")).rejects.toMatchObject({
      status: 403,
      code: "auth/company_suspended",
    });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe(COMPANY_SUSPENDED_EVENT);
  });

  it("un 403 de RBAC normal NO despacha el evento (discrimina por code, no por status)", async () => {
    fetchMock.mockResolvedValue(problemResponse(403, "rbac/permission_denied"));
    const http = new HttpClient("http://backend.test");

    const error = await http.get("/users").catch((e: unknown) => e);
    expect(isHttpError(error) && error.code === "rbac/permission_denied").toBe(true);
    expect(dispatched).toHaveLength(0);
  });

  it("un 401 de sesión NO despacha el evento", async () => {
    fetchMock.mockResolvedValue(problemResponse(401, "auth/unauthorized"));
    const http = new HttpClient("http://backend.test");

    await expect(http.get("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(dispatched).toHaveLength(0);
  });
});
