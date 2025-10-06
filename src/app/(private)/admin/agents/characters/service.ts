import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiCharactersPayload, ListCharactersParams, CharacterDTO, CreateCharacterDTO, UpdateCharacterDTO } from "./model";

export async function listCharacters(params: ListCharactersParams): Promise<ApiResponse<ApiCharactersPayload>> {
  return http.get<ApiResponse<ApiCharactersPayload>>("/parameters/character", params as Params, { authenticate: true });
}

export async function createCharacter(payload: CreateCharacterDTO): Promise<ApiResponse<CharacterDTO>> {
  return http.post<ApiResponse<CharacterDTO>>("/parameters/character", payload, { authenticate: true });
}

export async function updateCharacter(id: number | string, payload: UpdateCharacterDTO): Promise<ApiResponse<CharacterDTO>> {
  return http.put<ApiResponse<CharacterDTO>>(`/parameters/character/${id}`, payload, { authenticate: true });
}