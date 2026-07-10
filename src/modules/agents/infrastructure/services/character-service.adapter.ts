import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CharacterDTO,
  CreateCharacterDTO,
  UpdateCharacterDTO,
} from "@/modules/agents/domain/character";

/** Adapter HTTP → `/ai-characters` (incluye plantillas system, inmutables). */
export function listCharacters(): Promise<Schemas["CharacterListDto"]> {
  return http.get<Schemas["CharacterListDto"]>("/ai-characters");
}

export function createCharacter(dto: CreateCharacterDTO): Promise<CharacterDTO> {
  return http.post<CharacterDTO>("/ai-characters", dto);
}

export function updateCharacter(id: string, dto: UpdateCharacterDTO): Promise<CharacterDTO> {
  return http.patch<CharacterDTO>(`/ai-characters/${id}`, dto);
}

export function deleteCharacter(id: string): Promise<void> {
  return http.delete(`/ai-characters/${id}`);
}
