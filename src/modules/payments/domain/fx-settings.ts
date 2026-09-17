import type { Schemas } from "@/core/api/types";

/** Contratos del slice `payments` — moneda y TRM (F2 del programa Cobros). */
export type FxSettingsDTO = Schemas["FxSettingsDto"];
export type LatestFxRateDTO = Schemas["LatestFxRateDto"];
export type OfficialFxRateDTO = NonNullable<LatestFxRateDTO["official"]>;
export type EffectiveFxRateDTO = NonNullable<LatestFxRateDTO["effective"]>;

/** Tope del backend (`MAX_SPREAD_BPS`): 20 %. */
export const MAX_SPREAD_BPS = 2000;

export const FX_SOURCE_LABELS: Record<string, string> = {
  superfinanciera: "Superfinanciera",
  manual: "Tasa fijada por Axi",
  tenant_override: "Tu tasa manual",
};

/** Puntos básicos → texto es-CO («200» → «2,00 %»). */
export function spreadToPercent(bps: number): string {
  return (bps / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * «2,00 %» o «2.5» → puntos básicos; null si no es un número válido o se pasa
 * del tope del backend.
 *
 * A diferencia de `parseMoneyToCents`, el punto NO es separador de miles: un
 * porcentaje de cambio vive entre 0 y 20, así que «2.5» es dos y medio, no
 * veinticinco. Tratarlo como miles convertía un ajuste válido en un rechazo.
 */
export function percentToSpread(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").trim();
  if (cleaned === "") return null;
  // Con ambos separadores gana la coma como decimal (es-CO): «1.234,5».
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  const bps = Math.round(value * 100);
  return bps > MAX_SPREAD_BPS ? null : bps;
}

/** La tasa con 2 decimales, como se lee un precio («3.100,45»). */
export function formatRate(rate: number): string {
  return rate.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * ¿Hay que avisar de que la tasa oficial está vieja? El backend lo dice en
 * `stale` (la fuente no publicó y se usa la última conocida dentro del margen
 * de gracia); pasado el margen no hay tasa y `effective` llega null.
 */
export function fxNotice(latest: LatestFxRateDTO): "none" | "empty" | "stale" | "manual" {
  if (latest.effective === null) return "empty";
  if (latest.effective.source === "tenant_override") return "manual";
  if (latest.effective.stale) return "stale";
  return "none";
}

/** Una manual del tenant vigente hoy manda sobre la oficial. */
export function manualRateActive(settings: FxSettingsDTO, today: string): boolean {
  return settings.manual_rate !== null && settings.manual_rate.valid_until >= today;
}
