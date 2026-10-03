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

export type CreateOptOutSource = NonNullable<Schemas["CreateOptOutDto"]["source"]>;
export type CreatedOptOutDTO = Schemas["CreatedOptOutDto"];

/**
 * Alta manual desde el panel. 409 `marketing/opt_out_already_active` si ya
 * tenía baja; con `habeas_data` no es 409: la baja viva sube de origen y
 * vuelve `upgraded: true`.
 */
export function createOptOut(contactId: string, source: CreateOptOutSource): Promise<CreatedOptOutDTO> {
  return http.post<CreatedOptOutDTO>("/marketing/opt-outs", { contact_id: contactId, source });
}

/**
 * P1: revocar una baja de habeas data exige `acknowledge_habeas` también en la
 * API (422 sin él); la casilla del panel es la que lo pone.
 */
export function revokeOptOut(id: string, options: { acknowledge_habeas?: boolean } = {}): Promise<void> {
  return http.post<void>(`/marketing/opt-outs/${id}/revoke`, options.acknowledge_habeas === true ? { acknowledge_habeas: true } : {});
}
