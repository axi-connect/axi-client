import { http, Params } from "@/core/services/http";
import type { ApiResponse } from "@/core/services/api";
import type { ApiCharactersPayload, ListCharactersParams, CharacterDTO, CreateCharacterDTO, UpdateCharacterDTO } from "@/modules/agents/domain/character";

export async function listCharacters(params: ListCharactersParams): Promise<ApiResponse<ApiCharactersPayload>> {
  return http.get<ApiResponse<ApiCharactersPayload>>("/parameters/character", params as Params, { authenticate: true });
}

export async function createCharacter(payload: CreateCharacterDTO): Promise<ApiResponse<CharacterDTO>> {
  return http.post<ApiResponse<CharacterDTO>>("/parameters/character", payload, { authenticate: true });
}

export async function updateCharacter(id: number | string, payload: UpdateCharacterDTO): Promise<ApiResponse<CharacterDTO>> {
  return http.put<ApiResponse<CharacterDTO>>(`/parameters/character/${id}`, payload, { authenticate: true });
}

export async function deleteCharacter(id: number | string): Promise<ApiResponse<object>> {
  return http.delete<ApiResponse<object>>(`/parameters/character/${id}`, { authenticate: true });
}