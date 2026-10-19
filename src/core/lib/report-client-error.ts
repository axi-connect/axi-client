import { CLIENT_ERRORS_ENDPOINT } from "@/core/lib/chunk-recovery";

/**
 * Telemetría propia de errores del cliente (hotfix «Application error»).
 *
 * Antes de este hotfix un error del navegador no dejaba rastro en ninguna parte:
 * solo lo veía el usuario. Esto lo manda a `/api/client-errors`, que escribe una
 * línea `client_error` en los logs del contenedor (`docker logs`). Es un puente
 * hasta tener Sentry/GlitchTip (docs/plans/hotfix_application_error_plan.md).
 *
 * Nunca lanza ni espera: informar de un error no puede producir otro.
 */
export type ClientErrorKind = "chunk" | "boundary" | "global";

export type ClientErrorReport = {
  kind: ClientErrorKind;
  error: unknown;
  /** Qué frontera lo atrapó (`root`, `private`, `global`). */
  boundary?: string;
};

export function reportClientError({ kind, error, boundary }: ClientErrorReport): void {
  try {
    const e = (typeof error === "object" && error !== null ? error : {}) as {
      name?: unknown;
      message?: unknown;
      digest?: unknown;
      request?: unknown;
    };
    const body = JSON.stringify({
      kind,
      boundary,
      name: typeof e.name === "string" ? e.name : typeof error,
      message: typeof e.message === "string" ? e.message.slice(0, 300) : String(error).slice(0, 300),
      digest: typeof e.digest === "string" ? e.digest : undefined,
      asset: typeof e.request === "string" ? e.request : undefined,
      path: window.location.pathname,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(CLIENT_ERRORS_ENDPOINT, blob)) return;
    void fetch(CLIENT_ERRORS_ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Sin telemetría antes que un segundo error.
  }
}
