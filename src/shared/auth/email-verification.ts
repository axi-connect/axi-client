import { http } from "@/core/services/http";

/**
 * Reenvía el correo de verificación (contrato B2 del onboarding). Público: quien
 * lo pide puede tener la sesión a medias. Vive en `shared/auth` y no en el
 * adapter del onboarding porque lo consumen dos módulos —el paso «WhatsApp» del
 * onboarding y el wizard de canales— y `shared/` no puede importar de `modules/`
 * (§3.3.7).
 */
export function resendVerificationEmail(email: string): Promise<void> {
  return http.post<void>("/public/onboarding/resend-verification", { email }, { authenticate: false });
}
