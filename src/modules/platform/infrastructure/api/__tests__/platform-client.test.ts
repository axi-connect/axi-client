import { HttpError } from "@/core/api/problem";
import { PLATFORM_SESSION_EXPIRED_EVENT } from "../../../domain/auth";
import { clearPlatformSession, savePlatformSession } from "../../auth/token-storage";
import { authMiddleware, PLATFORM_LOGIN_PATH } from "../platform-client";

const BASE = "http://backend.test";

/** Fakes mínimos (jsdom no trae fetch/Request/Response; mismo patrón que problem.test.ts). */
function fakeRequest(path: string): Request {
  const headers = new Map<string, string>();
  return {
    url: `${BASE}${path}`,
    headers: {
      set: (k: string, v: string) => headers.set(k, v),
      get: (k: string) => headers.get(k) ?? null,
    },
  } as unknown as Request;
}

function fakeResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => null },
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

type MiddlewareArgs = { request: Request; response: Response };
const onRequest = (request: Request) =>
  (authMiddleware.onRequest as (a: Pick<MiddlewareArgs, "request">) => Promise<Request>)({ request });
const onResponse = (request: Request, response: Response) =>
  (authMiddleware.onResponse as (a: MiddlewareArgs) => Promise<Response>)({ request, response });

describe("platform-client middleware", () => {
  beforeEach(() => {
    clearPlatformSession();
    window.sessionStorage.clear();
  });

  it("adjunta Bearer desde memoria en rutas autenticadas", async () => {
    savePlatformSession({ token: "jwt-1", email: "admin@axi.dev", expiresAt: Date.now() + 900_000 });
    const req = fakeRequest("/api/v1/platform/tenants");

    await onRequest(req);

    expect(req.headers.get("Authorization")).toBe("Bearer jwt-1");
  });

  it("NO adjunta Bearer al login (aunque haya token en memoria)", async () => {
    savePlatformSession({ token: "jwt-viejo", email: "admin@axi.dev", expiresAt: Date.now() + 900_000 });
    const req = fakeRequest(PLATFORM_LOGIN_PATH);

    await onRequest(req);

    expect(req.headers.get("Authorization")).toBeNull();
  });

  it("respuesta !ok → lanza HttpError con el code RFC 7807", async () => {
    const req = fakeRequest("/api/v1/platform/tenants");
    const res = fakeResponse(409, {
      type: "x",
      title: "Conflict",
      status: 409,
      code: "tenant_db/not_active",
    });

    await expect(onResponse(req, res)).rejects.toMatchObject({
      name: "HttpError",
      status: 409,
      code: "tenant_db/not_active",
    });
  });

  it("401 fuera del login → despacha platform:session-expired antes de lanzar", async () => {
    const listener = jest.fn();
    window.addEventListener(PLATFORM_SESSION_EXPIRED_EVENT, listener);
    const req = fakeRequest("/api/v1/platform/plans");

    await expect(onResponse(req, fakeResponse(401))).rejects.toBeInstanceOf(HttpError);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PLATFORM_SESSION_EXPIRED_EVENT, listener);
  });

  it("401 EN el login → NO despacha session-expired (son credenciales inválidas)", async () => {
    const listener = jest.fn();
    window.addEventListener(PLATFORM_SESSION_EXPIRED_EVENT, listener);
    const req = fakeRequest(PLATFORM_LOGIN_PATH);

    await expect(
      onResponse(req, fakeResponse(401, { type: "x", title: "Unauthorized", status: 401, code: "auth/invalid_credentials" })),
    ).rejects.toMatchObject({ code: "auth/invalid_credentials" });

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(PLATFORM_SESSION_EXPIRED_EVENT, listener);
  });

  it("respuesta ok → pasa intacta", async () => {
    const req = fakeRequest("/api/v1/platform/tenants");
    const res = fakeResponse(200, { data: [] });

    await expect(onResponse(req, res)).resolves.toBe(res);
  });
});
