// Agents > Characters module models

export type CharactersSortDir = "asc" | "desc";
export type CharactersView = "summary" | "detail";
export type CharactersSortBy = "id" | "avatar_url";

export interface ListCharactersParams {
  avatar_url?: string;
  limit?: number; // default 20
  offset?: number; // default 0
  sortBy?: CharactersSortBy; // default id
  sortDir?: CharactersSortDir; // default desc
  view?: CharactersView; // default summary
}

export interface CharacterStyleDTO {
  font: string;
  primary_color: string;
  secondary_color: string;
  chat_bubble_shape: string;
}

export interface CharacterVoiceDTO {
  tone: string;
  speed: number;
  gender: string;
  language: string;
}

export interface CharacterResourcesDTO {
  stickers: string[];
  animations: string[];
}

export interface CharacterDTO {
  id: number | string;
  avatar_url: string;
  style?: CharacterStyleDTO;
  voice?: CharacterVoiceDTO;
  resources?: CharacterResourcesDTO;
  [key: string]: unknown;
}

export interface ApiCharactersPayload {
  characters: CharacterDTO[];
  total: number;
}