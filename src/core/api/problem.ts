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
  /** Extensión RFC 7807: lo que el error quiso decir además del código (`required`, `capability`, `upgrade_hint`). */
  details?: Record<string, unknown>;
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
  /**
   * Enlace de contraseña (invitación o restablecimiento) vencido, ya usado o
   * revocado: el servidor responde 410 con un solo código a propósito. Si trae
   * `details.reason`, la UI ajusta el copy; si no, asume «vencido».
   */
  passwordTokenInvalid: "auth/password_token_invalid",
  /** «Cambiar contraseña»: la actual no coincide. Es 422 y no 401 para que el BFF no borre la sesión. */
  currentPasswordInvalid: "auth/current_password_invalid",
  /** Throttle de intentos de contraseña (429, con `Retry-After`). No cierra la sesión. */
  tooManyAttempts: "auth/too_many_attempts",
  permissionDenied: "rbac/permission_denied",
  // Acceso de soporte (entrega F3)
  /** Acción bloqueada en una sesión de soporte (403): toast «No disponible en soporte». */
  supportActionForbidden: "auth/support_action_forbidden",
  /** WS de soporte sobre una cuenta suspendida: solo lectura y sin tiempo real. */
  supportReadonlySuspended: "auth/support_readonly_suspended",
  supportReauthFailed: "auth/support_reauth_failed",
  supportReauthLocked: "auth/support_reauth_locked",
  supportHandoffInvalid: "auth/support_handoff_invalid",
  /** Propio del BFF: la cookie de soporte venció o la revocaron (401 bajo soporte). */
  supportSessionEnded: "auth/support_session_ended",
  /** Propio del BFF: hay una sesión de cliente en el navegador; el canje no la toca. */
  supportSessionConflict: "auth/support_session_conflict",
  /** El rol lo permite pero el PLAN no lo incluye; `details.upgrade_hint.path` lleva a ampliarlo. */
  capabilityNotGranted: "entitlements/capability_not_granted",
  usageLimitExceeded: "usage/limit_exceeded",
  /** La función no está activa para este tenant; `details.settings_hint` lleva a encenderla. */
  featureDisabled: "features/feature_disabled",
  /** Axi fijó la función para este tenant: el interruptor del panel no puede cambiarla. */
  featureLockedByPlatform: "features/locked_by_platform",
  /** F3 Cobros: verificar sin monto cuando el tenant cobra por partes. */
  paymentAmountRequired: "orders/payment_amount_required",
  /** F3 Cobros: el pago verificado supera el saldo del pedido. */
  paymentExceedsBalance: "orders/payment_exceeds_balance",
  outsideServiceWindow: "channels/outside_service_window",
  /** F9 Cobros: enviar por correo un documento cuyo contacto no tiene correo en la ficha. */
  documentContactWithoutEmail: "documents/contact_without_email",
  /** F9 Cobros: ya hay un envío en curso por ese canal (doble clic, otro operador). */
  documentDeliveryInFlight: "documents/delivery_in_flight",
  /** F9 Cobros: el documento no tiene a quién enviarse (sin contacto). */
  documentNoCounterparty: "documents/no_counterparty",
  /** F4b Cobros: ya hay una promesa de pago viva en ese plan. */
  promiseExists: "collections/promise_exists",
  /** F4b Cobros: las cuotas pendientes no suman el saldo. */
  scheduleMismatch: "collections/schedule_mismatch",
  /** F4b Cobros: el plan no está activo (saldado, cancelado o en pausa). */
  planNotActive: "collections/plan_not_active",
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
  // Activación del plan (Tanda B)
  priceChanged: "billing/price_changed",
  promotionClosed: "billing/promotion_closed",
  noPendingOffer: "billing/no_pending_offer",
  termExists: "billing/term_exists",
  activationUnsupported: "billing/activation_unsupported",
  // Tanda B del alta: el tramo y el periodo que vio el visitante viajan en `offer`
  volumeTierInvalid: "onboarding/volume_tier_invalid",
  intervalInvalid: "onboarding/interval_invalid",
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
 * CustomEvent del DOM de una sesión de soporte: lo despacha el `HttpClient`
 * ante `auth/support_action_forbidden` o `auth/support_session_ended`, y lo
 * escucha la barra de soporte (solo existe bajo la cookie de soporte). El
 * `detail` lleva el code.
 */
export const SUPPORT_SESSION_EVENT = "auth:support:signal";

/** A dónde va la pestaña de soporte cuando la sesión termina. */
export const SUPPORT_ENDED_PATH = "/auth/soporte?fin=1";

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
          // QA-1: la extensión `details` (scope, reason, upgrade_hint…) se
          // perdía aquí y todo consumidor de `problem.details` veía undefined
          ...(typeof body.details === "object" && body.details !== null && !Array.isArray(body.details)
            ? { details: body.details }
            : {}),
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

/**
 * Para una sección OPCIONAL de una página compuesta: si el usuario no tiene el
 * permiso de esa sección (403) se pinta vacía y el resto de la página sigue;
 * cualquier otro error (red caída, 500, 404 del recurso) sube y se ve. Un
 * `catch` que devuelve vacío para todo convertiría una API caída en «este
 * contacto no tiene pedidos», que es mentira.
 */
export function emptyIfForbidden<T>(fallback: T): (error: unknown) => T {
  return (error) => {
    if (isHttpError(error) && error.status === 403) return fallback;
    throw error;
  };
}
