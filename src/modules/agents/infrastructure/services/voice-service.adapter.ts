import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { TtsCredentialStatusDTO, VoiceSettingsDTO } from "@/modules/agents/domain/voice";

/**
 * Adapter HTTP de la voz del slice agents (§10.5 F2): catálogo curado,
 * switch del tenant y credencial BYOK.
 */

/** Catálogo de voces pre-aprobadas. `preview_url` viene presignada (TTL 1 h):
 * consumir al abrir el selector, jamás persistir en estado duradero. */
export function listAiVoices(): Promise<Schemas["AiVoiceListDto"]> {
  return http.get<Schemas["AiVoiceListDto"]>("/ai-voices");
}

/** Switch de voz de la empresa. Opt-in estricto: arranca en `false`. */
export function getVoiceSettings(): Promise<VoiceSettingsDTO> {
  return http.get<VoiceSettingsDTO>("/ai-agents/voice-settings");
}

/** Efecto en caliente: el turno siguiente ya obedece el switch. */
export function updateVoiceSettings(dto: VoiceSettingsDTO): Promise<void> {
  return http.put("/ai-agents/voice-settings", dto);
}

/** Estado de la credencial BYOK — jamás devuelve la clave. */
export function getVoiceCredential(): Promise<TtsCredentialStatusDTO> {
  return http.get<TtsCredentialStatusDTO>("/ai-voice-credential");
}

/** Solo plan enterprise: 403 `ai/tts_byok_requires_enterprise` si no aplica. */
export function upsertVoiceCredential(apiKey: string): Promise<void> {
  return http.put("/ai-voice-credential", { api_key: apiKey });
}

/** Siempre permitido: quitar la clave degrada a la cuenta de axi. */
export function deleteVoiceCredential(): Promise<void> {
  return http.delete("/ai-voice-credential");
}

export type VoiceUsage = Schemas["UsageSummaryDto"]["metrics"][number];

/**
 * Consumo de caracteres de voz del ciclo (barra de la página de
 * configuración). `null` = el resumen no trae la métrica o el permiso
 * `usage:read` falta — la página simplemente no pinta la barra.
 */
export async function getVoiceUsage(): Promise<VoiceUsage | null> {
  try {
    const summary = await http.get<Schemas["UsageSummaryDto"]>("/usage/summary");
    return summary.metrics.find((entry) => entry.metric === "tts_characters") ?? null;
  } catch {
    return null;
  }
}
