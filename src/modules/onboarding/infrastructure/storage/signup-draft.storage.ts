import type { CompanyDraft, OfferSelection } from "@/modules/onboarding/domain/signup-draft";

/**
 * Borrador del registro en `sessionStorage`: sobrevive a una recarga, muere al
 * cerrar la pestaña. **La contraseña nunca se guarda**: recargar en el paso 3
 * vuelve al paso 3 con la cuenta vacía, a propósito.
 *
 * Toda lectura/escritura va en `try/catch`: en navegación privada o con el
 * almacenamiento bloqueado el accessor lanza, y un funnel que no puede recordar
 * el borrador sigue teniendo que funcionar.
 */
const KEY = "axi.signup.draft.v1";

export type StoredSignupDraft = {
  offer: OfferSelection | null;
  company: CompanyDraft | null;
  step: number;
};

export function readSignupDraft(): StoredSignupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSignupDraft>;
    return {
      offer: parsed.offer ?? null,
      company: parsed.company ?? null,
      step: typeof parsed.step === "number" ? parsed.step : 0,
    };
  } catch {
    return null;
  }
}

export function writeSignupDraft(draft: StoredSignupDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento disponible: el funnel sigue, solo no recuerda.
  }
}

export function clearSignupDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Idem.
  }
}
