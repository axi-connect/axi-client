import { http } from "@/core/services/http";
import type { EntitlementsDTO } from "@/modules/onboarding/domain/entitlements";
import type {
  OnboardingProgressDTO,
  UpdateOnboardingProgressDTO,
} from "@/modules/onboarding/domain/onboarding-progress";

/**
 * Adapter HTTP del onboarding (contrato B3 de
 * `axi-server/docs/plans/onboarding_self_service_backend_plan.md`). Rutas
 * relativas a `/api/v1`; autenticado por defecto (pasa por el BFF).
 */
export function getOnboardingProgress(): Promise<OnboardingProgressDTO> {
  return http.get<OnboardingProgressDTO>("/onboarding/progress");
}

/** Merge parcial en el servidor: solo viaja lo que cambia. */
export function updateOnboardingProgress(patch: UpdateOnboardingProgressDTO): Promise<OnboardingProgressDTO> {
  return http.put<OnboardingProgressDTO>("/onboarding/progress", patch);
}

/**
 * Oculta el banner del dashboard. Endpoint propio con `companies:read`: es una
 * preferencia de quien lo ve, no una edición de la empresa (con el PUT un
 * operador veía un banner que no podía quitar).
 */
export function dismissOnboardingBanner(): Promise<OnboardingProgressDTO> {
  return http.post<OnboardingProgressDTO>("/onboarding/progress/dismiss-banner", {});
}

/** Idempotente: repetirlo con el onboarding ya cerrado responde 200. */
export function completeOnboarding(): Promise<OnboardingProgressDTO> {
  return http.post<OnboardingProgressDTO>("/onboarding/complete", {});
}

/** Contrato B1: capacidades y cuotas del tenant en unidades comerciales. */
export function getMyEntitlements(): Promise<EntitlementsDTO> {
  return http.get<EntitlementsDTO>("/me/entitlements");
}

/**
 * Reenvía el correo de verificación (contrato B2). Público y con respuesta
 * idéntica exista o no la cuenta: 202 sin cuerpo.
 */
// La implementación vive en `shared/auth`: la consumen el paso «WhatsApp» y el
// wizard de canales a través de `EmailVerificationGate`
export { resendVerificationEmail } from "@/shared/auth/email-verification";

/**
 * Confirma el correo con el token que viajó en el enlace (contrato B2).
 * Público: quien pulsa el enlace puede no tener sesión (otro dispositivo).
 * `410 onboarding/verification_expired` cubre token vencido, usado o desconocido.
 */
export function verifyEmail(token: string): Promise<{ verified: true }> {
  return http.post<{ verified: true }>("/public/onboarding/verify-email", { token }, { authenticate: false });
}
