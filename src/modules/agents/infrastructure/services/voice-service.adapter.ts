import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { VoiceSettingsDTO } from "@/modules/agents/domain/voice";

/**
 * Adapter HTTP de la voz del slice agents (§10.5): el catálogo curado y la
 * LECTURA del interruptor de la empresa. Encenderlo, apagarlo y la llave propia
 * de ElevenLabs son de /platform desde el gobierno de la voz (2026-09-21): el
 * tenant ya no tiene endpoints para eso.
 */

/** Catálogo de voces pre-aprobadas. `preview_url` viene presignada (TTL 1 h):
 * consumir al abrir el selector, jamás persistir en estado duradero. */
export function listAiVoices(): Promise<Schemas["AiVoiceListDto"]> {
  return http.get<Schemas["AiVoiceListDto"]>("/ai-voices");
}

/** Interruptor de voz de la empresa, solo lectura (lo enciende axi). El estudio
 * lo usa para explicar por qué el picker de voz está deshabilitado. */
export function getVoiceSettings(): Promise<VoiceSettingsDTO> {
  return http.get<VoiceSettingsDTO>("/ai-agents/voice-settings");
}
