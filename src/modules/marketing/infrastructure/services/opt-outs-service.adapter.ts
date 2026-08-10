import type { Paginated } from "@/core/api/types";
import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";

export type OptOutDTO = Schemas["OptOutsListDto"]["data"][number];

/**
 * Adapter HTTP de las bajas (`/marketing/opt-outs`).
 * Toda audiencia las excluye estructuralmente: este listado es el registro
 * legal de quién pidió no recibir promociones, y revocar NO borra el historial.
 */

export function listOptOuts(
  params: { active_only?: boolean; page?: number; page_size?: number } = {},
): Promise<Paginated<OptOutDTO>> {
  const { active_only, ...rest } = params;
  return http.get<Paginated<OptOutDTO>>("/marketing/opt-outs", {
    ...rest,
    // El backend lo declara como enum de strings, no como booleano.
    ...(active_only !== undefined && { active_only: active_only ? "true" : "false" }),
  });
}

/** 409 `marketing/opt_out_already_active` si el contacto ya está de baja. */
export function createOptOut(contactId: string): Promise<OptOutDTO> {
  return http.post<OptOutDTO>("/marketing/opt-outs", { contact_id: contactId });
}

export function revokeOptOut(id: string): Promise<void> {
  return http.post<void>(`/marketing/opt-outs/${id}/revoke`);
}
