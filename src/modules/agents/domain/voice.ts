import type { Schemas } from "@/core/api/types";

/**
 * Contratos de voz del slice agents (§10.5).
 *
 * - Catálogo curado (`GET /ai-voices`): lista corta de voces pre-aprobadas por
 *   la plataforma; el tenant elige de aquí, jamás navega el proveedor.
 * - Interruptor de la empresa (`GET /ai-agents/voice-settings`): SOLO lectura.
 *   La voz cuesta dinero y viene APAGADA por defecto; la enciende axi desde
 *   /platform (gobierno de la voz, 2026-09-21), no el tenant.
 * - La llave propia de ElevenLabs también la gestiona axi desde /platform; el
 *   tenant no tiene contrato para ella. La voz POR AGENTE vive en `agent.ts`.
 */
export type AiVoiceDTO = Schemas["AiVoiceListDto"]["data"][number];
export type VoiceSettingsDTO = Schemas["VoiceSettingsDto"];

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
