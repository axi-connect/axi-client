import type { Schemas } from "@/core/api/types";

/**
 * Contratos de tags y segmentos (`/crm/tags`, `/crm/segments`).
 * F1 solo consume `TagDTO` (filtro por tag del listado de contactos);
 * el DSL de segmentos y su builder llegan en F5.
 */

export type TagDTO = Schemas["TagsListDto"]["data"][number];
export type CreateTagDTO = Schemas["CreateTagDto"];
export type UpdateTagDTO = Schemas["UpdateTagDto"];
