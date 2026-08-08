import { http } from "@/core/services/http";
import type { SchedulingSettingsDTO } from "@/modules/scheduling/domain/settings";

/**
 * Parámetros de agenda (`/scheduling/settings`). El GET devuelve la vista
 * RESUELTA (defaults del sistema aplicados); el PUT es de sección completa y
 * responde la vista resuelta post-escritura — usarla para refrescar el form.
 */
export function getSchedulingSettings(): Promise<SchedulingSettingsDTO> {
  return http.get<SchedulingSettingsDTO>("/scheduling/settings");
}

export function putSchedulingSettings(
  dto: SchedulingSettingsDTO,
): Promise<SchedulingSettingsDTO> {
  return http.put<SchedulingSettingsDTO>("/scheduling/settings", dto);
}
