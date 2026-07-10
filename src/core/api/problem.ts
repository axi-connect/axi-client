/**
 * Errores del backend — RFC 7807 (`application/problem+json`).
 *
 * Todo error HTTP del backend llega con esta forma y se discrimina por `code`
 * (string `namespace/code`), nunca por `title`. El catálogo completo vive en
 * `axi-server/src/core/shared/errors/error_code.ts`.
 */

/** Issue de validación de Zod incluido en `errors[]` cuando `code === "validation/failed"`. */
export type ValidationIssue = {
  path?: (string | number)[];
  message: string;
  code?: string;
};

/** Cuerpo RFC 7807 emitido por el GlobalExceptionFilter del backend. */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  trace_id?: string;
  errors?: ValidationIssue[];
};

/** Códigos de error que el frontend maneja con lógica propia. */
export const API_ERROR_CODES = {
  validationFailed: "validation/failed",
  invalidCredentials: "auth/invalid_credentials",
  ambiguousCompany: "auth/ambiguous_company",
  invalidRefresh: "auth/invalid_refresh",
  refreshReuseDetected: "auth/refresh_reuse_detected",
  unauthorized: "auth/unauthorized",
  companySuspended: "auth/company_suspended",
  permissionDenied: "rbac/permission_denied",
  usageLimitExceeded: "usage/limit_exceeded",
  outsideServiceWindow: "channels/outside_service_window",
  invalidTransition: "conversations/invalid_transition",
  handoffConflict: "conversations/handoff_conflict",
  notFound: "resource/not_found",
  unexpected: "internal/unexpected",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Error normalizado que lanza el HttpClient. Conserva el problema RFC 7807
 * completo, el `code` para discriminar y `retryAfterSeconds` cuando el
 * backend responde 429 con header `Retry-After`.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: ProblemDetails | null;
  readonly retryAfterSeconds?: number;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    problem?: ProblemDetails | null;
    retryAfterSeconds?: number;
  }) {
    super(args.message);
    this.name = "HttpError";
    this.status = args.status;
    this.code = args.code;
    this.problem = args.problem ?? null;
    this.retryAfterSeconds = args.retryAfterSeconds;
  }

  /** Issues de validación (solo presentes cuando `code === "validation/failed"`). */
  get validationIssues(): ValidationIssue[] {
    return this.problem?.errors ?? [];
  }

  is(code: ApiErrorCode | string): boolean {
    return this.code === code;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

function parseRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get("Retry-After");
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/**
 * Convierte una `Response` no-ok en un `HttpError`, leyendo el cuerpo
 * `application/problem+json` cuando existe y degradando con gracia si no.
 */
export async function parseHttpError(res: Response): Promise<HttpError> {
  const retryAfterSeconds = parseRetryAfter(res);
  let problem: ProblemDetails | null = null;

  try {
    const text = await res.text();
    if (text) {
      const body = JSON.parse(text) as Partial<ProblemDetails>;
      if (typeof body === "object" && body !== null && typeof body.code === "string") {
        problem = {
          type: body.type ?? "about:blank",
          title: body.title ?? res.statusText,
          status: body.status ?? res.status,
          code: body.code,
          detail: body.detail,
          trace_id: body.trace_id,
          errors: body.errors,
        };
      }
    }
  } catch {
    // Cuerpo no-JSON (proxy caído, HTML de error, etc.) → error genérico.
  }

  return new HttpError({
    status: problem?.status ?? res.status,
    code: problem?.code ?? `http/${res.status}`,
    message: problem?.detail ?? problem?.title ?? `HTTP ${res.status}`,
    problem,
    retryAfterSeconds,
  });
}
