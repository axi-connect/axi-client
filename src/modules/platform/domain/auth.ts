/**
 * Dominio de autenticación del panel de plataforma (super admin de axi).
 *
 * A diferencia del auth de tenant (cookies HttpOnly + BFF), la sesión de
 * plataforma vive en `sessionStorage` + memoria: access token de ~15 min,
 * SIN refresh — al vencer se re-loguea vía ReLoginModal (spec D1/D2 de
 * `axi-server/docs/plans/frontend_platform_plan.md`).
 */
import type { Schemas } from "@/core/api/types";

/** Respuesta de `POST /platform/auth/login` (wire, snake_case). */
export type PlatformTokens = Schemas["PlatformTokensDto"];

/** Sesión activa del super admin (forma de UI). */
export type PlatformSession = {
  email: string;
  /** Epoch ms en que vence el access token (`Date.now() + expires_in*1000`). */
  expiresAt: number;
};

/** Claves de `sessionStorage` de la sesión de plataforma (spec §2.2). */
export const PLATFORM_STORAGE_KEYS = {
  token: "axi.platform.token",
  exp: "axi.platform.exp",
  email: "axi.platform.email",
} as const;

/**
 * Evento DOM que emite el cliente API ante un 401 fuera del login.
 * Lo escucha `PlatformAuthProvider` para abrir el `ReLoginModal`.
 */
export const PLATFORM_SESSION_EXPIRED_EVENT = "platform:session-expired";

/** Umbral del aviso de expiración (banner "Renovar ahora"): T−2 min. */
export const SESSION_WARNING_MS = 2 * 60 * 1000;
