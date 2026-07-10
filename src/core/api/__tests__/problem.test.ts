import { API_ERROR_CODES, HttpError, isHttpError, parseHttpError } from "../problem";

/**
 * Fixtures basados en respuestas reales del GlobalExceptionFilter del backend
 * (RFC 7807, `application/problem+json`).
 */
function fakeResponse(args: {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  statusText?: string;
}): Response {
  const headers = new Map(Object.entries(args.headers ?? {}));
  return {
    status: args.status,
    statusText: args.statusText ?? "",
    headers: { get: (name: string) => headers.get(name) ?? null },
    text: async () => (args.body === undefined ? "" : JSON.stringify(args.body)),
  } as unknown as Response;
}

describe("parseHttpError", () => {
  it("parsea un 400 validation/failed con issues de Zod", async () => {
    const res = fakeResponse({
      status: 400,
      body: {
        type: "https://docs.axi-connect.dev/errors/validation/failed",
        title: "Validation failed",
        status: 400,
        code: "validation/failed",
        trace_id: "req-1",
        errors: [{ path: ["email"], message: "Invalid email", code: "invalid_string" }],
      },
    });

    const error = await parseHttpError(res);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(400);
    expect(error.code).toBe(API_ERROR_CODES.validationFailed);
    expect(error.validationIssues).toHaveLength(1);
    expect(error.validationIssues[0].path).toEqual(["email"]);
    expect(error.problem?.trace_id).toBe("req-1");
  });

  it("parsea un 401 auth/refresh_reuse_detected", async () => {
    const res = fakeResponse({
      status: 401,
      body: {
        type: "https://docs.axi-connect.dev/errors/auth/refresh_reuse_detected",
        title: "Refresh token reuse detected",
        status: 401,
        code: "auth/refresh_reuse_detected",
      },
    });

    const error = await parseHttpError(res);

    expect(error.is(API_ERROR_CODES.refreshReuseDetected)).toBe(true);
    expect(error.message).toBe("Refresh token reuse detected");
  });

  it("captura Retry-After en un 429 usage/limit_exceeded", async () => {
    const res = fakeResponse({
      status: 429,
      headers: { "Retry-After": "42" },
      body: {
        type: "https://docs.axi-connect.dev/errors/usage/limit_exceeded",
        title: "Usage limit exceeded",
        status: 429,
        code: "usage/limit_exceeded",
        detail: "ai_tokens_input limit reached",
      },
    });

    const error = await parseHttpError(res);

    expect(error.status).toBe(429);
    expect(error.code).toBe(API_ERROR_CODES.usageLimitExceeded);
    expect(error.retryAfterSeconds).toBe(42);
    expect(error.message).toBe("ai_tokens_input limit reached");
  });

  it("degrada con gracia ante cuerpos no-JSON (proxy caído, HTML)", async () => {
    const res = {
      status: 502,
      statusText: "Bad Gateway",
      headers: { get: () => null },
      text: async () => "<html>Bad Gateway</html>",
    } as unknown as Response;

    const error = await parseHttpError(res);

    expect(error.status).toBe(502);
    expect(error.code).toBe("http/502");
    expect(error.problem).toBeNull();
  });

  it("isHttpError discrimina errores propios", async () => {
    const error = await parseHttpError(fakeResponse({ status: 404, body: { code: "resource/not_found", title: "Not found", status: 404, type: "x" } }));
    expect(isHttpError(error)).toBe(true);
    expect(isHttpError(new Error("x"))).toBe(false);
  });
});
