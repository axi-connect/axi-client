import { http } from "@/core/services/http";
import type { FxSettingsDTO, LatestFxRateDTO } from "@/modules/payments/domain/fx-settings";

/**
 * Adapter del slice `fx` visto por el tenant (`/fx/*`, capacidad `sales` +
 * función `fx_quotes`). Sin la función el backend responde 403
 * `features/feature_disabled` y la vista lo explica.
 */
export function getFxSettings(): Promise<FxSettingsDTO> {
  return http.get<FxSettingsDTO>("/fx/settings");
}

export function saveFxSettings(settings: FxSettingsDTO): Promise<FxSettingsDTO> {
  return http.put<FxSettingsDTO>("/fx/settings", settings);
}

/** `official` = la fila oficial vigente; `effective` = la del tenant con su ajuste. */
export function getLatestFxRate(base = "USD", quote = "COP"): Promise<LatestFxRateDTO> {
  return http.get<LatestFxRateDTO>(`/fx/rates/latest?base=${base}&quote=${quote}`);
}
