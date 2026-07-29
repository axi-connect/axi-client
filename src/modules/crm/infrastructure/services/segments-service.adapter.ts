import { http } from "@/core/services/http";
import type { TagDTO } from "@/modules/crm/domain/segment";

/**
 * Adapter HTTP de tags y segmentos (`/crm/tags`, `/crm/segments`).
 * F1 solo necesita el listado de tags (filtro de contactos); el CRUD de
 * tags/segmentos y la ejecución del DSL se completan en F5.
 */
export async function listTags(): Promise<TagDTO[]> {
  const res = await http.get<{ data: TagDTO[] }>("/crm/tags");
  return res.data;
}
