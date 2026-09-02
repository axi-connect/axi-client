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
export function resendVerificationEmail(email: string): Promise<void> {
  return http.post<void>("/public/onboarding/resend-verification", { email }, { authenticate: false });
}
