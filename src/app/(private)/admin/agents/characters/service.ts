import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiCharactersPayload, ListCharactersParams } from "./model";

export async function listCharacters(params: ListCharactersParams): Promise<ApiResponse<ApiCharactersPayload>> {
  return http.get<ApiResponse<ApiCharactersPayload>>("/parameters/character", params as Params, { authenticate: true });
}