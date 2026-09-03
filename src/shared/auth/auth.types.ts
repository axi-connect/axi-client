import type { Schemas } from "@/core/api/types";

/**
 * Tipos de autenticación — derivados del contrato OpenAPI del backend.
 * El perfil de sesión es `MeDto` (incluye `role` y `permissions[]`).
 */
export type AuthUser = Schemas["MeDto"];

/** Respuesta de login y refresh: `{ access_token, token_type, expires_in, refresh_token }`. */
export type AuthTokens = Schemas["AuthTokensDto"];

/** `company_nit` solo es necesario si el email existe en varios tenants (409 auth/ambiguous_company). */
export type LoginPayload = {
  email: string;
  password: string;
  company_nit?: string;
};

/**
 * Alta autoservicio (`POST /api/auth/signup` → backend `/public/onboarding/signups`).
 * Wire en `snake_case`, 1:1 con el contrato B2 de
 * `axi-server/docs/plans/onboarding_self_service_backend_plan.md`.
 */
export type SignupPayload = Schemas["SignupDto"];

/** Lo que responde el backend al alta; el BFF consume `tokens` y no los reenvía. */
export type SignupResponse = Schemas["SignupResultDto"];

/** Lo que el BFF devuelve al browser tras sembrar las cookies (sin tokens). */
export type SignupResult = { success: true } & Pick<SignupResponse, "company_id" | "user_id" | "trial_ends_at">;

export type SessionResponse = {
  isAuthenticated: boolean;
  user?: AuthUser;
  /**
   * Código RFC 7807 del fallo de hidratación cuando el cliente debe
   * distinguirlo del "sin sesión" genérico (hoy solo
   * `auth/company_suspended` → pantalla bloqueante, no login).
   */
  code?: string;
};

/** Contrato de `GET /api/auth/token` (solo para el handshake de WebSocket). */
export type WsTokenResponse = {
  token: string;
  /** Epoch en milisegundos en que expira el access token. */
  expires_at: number;
};

export const COOKIE_NAMES = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
} as const;

/** Vida del refresh token en el backend (JWT_REFRESH_TTL_DAYS = 14). */
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
