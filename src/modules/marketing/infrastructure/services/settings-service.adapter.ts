import { http } from "@/core/services/http";
import type { MarketingSettings } from "@/modules/marketing/domain/settings";

/**
 * Ajustes del módulo (`/marketing/settings`).
 *
 * El PUT exige la sección COMPLETA, no un parche: por eso el formulario parte
 * siempre del GET (que devuelve los defaults ya rellenos) y reenvía todo. Un
 * parche parcial borraría las claves que no viajen.
 */

export function getMarketingSettings(): Promise<MarketingSettings> {
  return http.get<MarketingSettings>("/marketing/settings");
}

export function putMarketingSettings(settings: MarketingSettings): Promise<MarketingSettings> {
  return http.put<MarketingSettings>("/marketing/settings", settings);
}
