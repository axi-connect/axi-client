import type { Schemas } from "@/core/api/types";

/**
 * Contratos de voz del slice agents (§10.5 F2).
 *
 * - Catálogo curado (`GET /ai-voices`): lista corta de voces pre-aprobadas por
 *   la plataforma; el tenant elige de aquí, jamás navega el proveedor.
 * - Switch del tenant (`/ai-agents/voice-settings`): opt-in de empresa —
 *   la voz cuesta dinero y viene APAGADA por defecto.
 * - Credencial BYOK (`/ai-voice-credential`): exclusiva de plan enterprise,
 *   write-only (el GET jamás devuelve la clave).
 */
export type AiVoiceDTO = Schemas["AiVoiceListDto"]["data"][number];
export type VoiceSettingsDTO = Schemas["VoiceSettingsDto"];
export type TtsCredentialStatusDTO = Schemas["TtsCredentialStatusDto"];

export const VOICE_GENDER_LABELS: Record<string, string> = {
  female: "Femenina",
  male: "Masculina",
};

/** `preview_url` es una URL presignada con TTL de 1 h: se consume al abrir el
 * selector y NUNCA se persiste en estado duradero. `null` = muestra pendiente. */
export function voiceGenderLabel(gender: string | null): string | null {
  if (gender === null) return null;
  return VOICE_GENDER_LABELS[gender] ?? gender;
}
