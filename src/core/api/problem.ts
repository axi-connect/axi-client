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
  trialExpired: "auth/trial_expired",
  paymentOverdue: "auth/payment_overdue",
  permissionDenied: "rbac/permission_denied",
  usageLimitExceeded: "usage/limit_exceeded",
  outsideServiceWindow: "channels/outside_service_window",
  invalidTransition: "conversations/invalid_transition",
  handoffConflict: "conversations/handoff_conflict",
  notFound: "resource/not_found",
  unexpected: "internal/unexpected",
  // Registro autoservicio (contrato B2, onboarding_self_service_backend_plan.md)
  nitTaken: "identities/nit_taken",
  nitInvalid: "onboarding/nit_invalid",
  emailInUse: "onboarding/email_in_use",
  emailDisposable: "onboarding/email_disposable",
  offerInvalid: "onboarding/offer_invalid",
  offerNotSelfService: "onboarding/offer_not_self_service",
  captchaFailed: "onboarding/captcha_failed",
  signupRateLimited: "onboarding/signup_rate_limited",
  verificationExpired: "onboarding/verification_expired",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * CustomEvent del DOM que anuncia la suspensión de la empresa (F15).
 * Lo despachan el `HttpClient` (403 de suspensión en cualquier request) y los
 * hooks de tiempo real (evento WS `company.suspended`); lo escucha únicamente
 * el `AuthProvider`, que corta la sesión y muestra la pantalla bloqueante.
 * El `detail` lleva el code (`auth/company_suspended` | `auth/trial_expired` |
 * `auth/payment_overdue`) para elegir la variante de copy; un Event sin detail
 * cae a la genérica.
 * Convención `familia:acción:estado` (architecture §9).
 */
export const COMPANY_SUSPENDED_EVENT = "auth:company:suspended";

/**
 * ¿El code corresponde a un bloqueo total de la empresa (F15)? El trial vencido
 * y la mora comparten TODO el mecanismo de la suspensión (tokens revocados,
 * pantalla bloqueante, sin refresh) — solo cambia el copy de la pantalla.
 *
 * `auth/payment_overdue` entra aquí y no en un camino propio porque el backend
 * lo devuelve en los **tres** puntos de bloqueo —login, refresh y el verifier
 * del access token (`auth/application/suspension_reason.ts`)—, exactamente como
 * los otros dos. El código existe separado del genérico **para el frontend**:
 * permite llevar a quien solo necesita pagar a una pantalla de pago en vez de a
 * un callejón sin salida de «contacta a soporte».
 */
export function isSuspensionCode(code: string | undefined): boolean {
  return (
    code === API_ERROR_CODES.companySuspended ||
    code === API_ERROR_CODES.trialExpired ||
    code === API_ERROR_CODES.paymentOverdue
  );
}

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
