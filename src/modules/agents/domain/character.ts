// Agents > Characters module models

import { SelectOption } from "@/shared/api/query";

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
  background: string;
  primary_color: string;
  secondary_color: string;
  chat_bubble_shape: string;
}

export interface CharacterVoiceDTO {
  url: string;
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

export interface CharacterGalleryProps {
  hasNext?: boolean;
  hasPrev?: boolean;
  characters: CharacterDTO[];
  onNextPage?: () => void | Promise<void>;
  onPrevPage?: () => void | Promise<void>;
  onEdit?: (character: CharacterDTO) => void;
  onDetail: (character: CharacterDTO) => void; // default edit action
  onDelete?: (character: CharacterDTO) => void;
}

// Create DTO
export interface CreateCharacterDTO {
  avatar_url?: string;
  style?: CharacterStyleDTO | Record<string, unknown> | null;
  voice?: CharacterVoiceDTO | Record<string, unknown> | null;
  resources?: CharacterResourcesDTO | Record<string, unknown> | null;
}

export type UpdateCharacterDTO = Partial<CreateCharacterDTO>

export type CharacterOption = SelectOption & { avatar: string, style?: CharacterStyleDTO }