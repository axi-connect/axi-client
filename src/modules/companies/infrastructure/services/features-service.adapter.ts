import { http } from "@/core/services/http";
import type { FeaturesDTO } from "@/shared/auth/features.store";

/**
 * Adapter del slice `features` visto por el tenant (`PUT /features/:code`,
 * permiso `features:manage`). La lectura vive en `shared/auth/features.store`
 * porque la consume el panel entero, no solo esta pestaña.
 *
 * Responde la lista completa ya resuelta: un interruptor puede cambiar el
 * estado de otra función (las dependencias son fail-closed), así que la vista
 * se repinta con lo que diga el servidor, no con lo que supuso.
 */
export function setTenantFeature(code: string, enabled: boolean): Promise<FeaturesDTO> {
  return http.put<FeaturesDTO>(`/features/${code}`, { enabled });
}
