import type { Schemas } from "@/core/api/types";

/**
 * Characters (`/ai-characters`): personalidad visual/estilística del agente.
 * Los `is_system` son plantillas inmutables provistas por la plataforma.
 */
export type CharacterDTO = Schemas["CharacterDto"];
export type CreateCharacterDTO = Schemas["CreateCharacterDto"];
export type UpdateCharacterDTO = Schemas["UpdateCharacterDto"];

/** El backend modela style como JSON libre; la UI usa esta forma conocida. */
export type CharacterStyle = {
  background?: string;
  tone?: string;
} & Record<string, unknown>;

export function characterStyle(character: CharacterDTO): CharacterStyle {
  return (character.style ?? {}) as CharacterStyle;
}

/**
 * `character.voice` (§10.5): CÓMO suena el character. Espejo del parser del
 * backend (`voice_policy.ts#characterVoice`): sin `voice_id` no hay voz — la
 * política degrada sola a texto, nunca hay error por "voz incompleta".
 */
export type CharacterVoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
};

export type CharacterVoice = {
  provider?: string;
  voice_id?: string;
  model_id?: string;
  settings?: CharacterVoiceSettings;
} & Record<string, unknown>;

export function characterVoice(character: CharacterDTO): CharacterVoice {
  return (character.voice ?? {}) as CharacterVoice;
}

/** Un character "tiene voz" cuando eligió una del catálogo. */
export function characterHasVoice(character: CharacterDTO): boolean {
  const voice = characterVoice(character);
  return typeof voice.voice_id === "string" && voice.voice_id.length > 0;
}
