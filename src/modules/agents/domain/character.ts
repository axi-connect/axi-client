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
