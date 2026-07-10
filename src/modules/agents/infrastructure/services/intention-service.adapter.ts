import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CreateIntentionDTO,
  IntentionDTO,
  UpdateIntentionDTO,
} from "@/modules/agents/domain/intentions";

/** Adapter HTTP → `/ai-intentions` (incluye plantillas system, inmutables). */
export function listIntentions(): Promise<Schemas["IntentionListDto"]> {
  return http.get<Schemas["IntentionListDto"]>("/ai-intentions");
}

export function createIntention(dto: CreateIntentionDTO): Promise<IntentionDTO> {
  return http.post<IntentionDTO>("/ai-intentions", dto);
}

export function updateIntention(id: string, dto: UpdateIntentionDTO): Promise<IntentionDTO> {
  return http.patch<IntentionDTO>(`/ai-intentions/${id}`, dto);
}

export function deleteIntention(id: string): Promise<void> {
  return http.delete(`/ai-intentions/${id}`);
}
