/**
 * Dominio del pricing de modelos IA. TypeScript PURO.
 *
 * Modelo de versionado del backend (spec §3.5/D14): las tarifas se versionan
 * POR VIGENCIA — el PATCH solo permite costos/margen/`effective_to`; cambiar
 * precios desde una fecha = cerrar la tarifa vigente con `effective_to` y
 * crear una nueva (el POST es upsert por `(provider, model, effective_from)`).
 */
import type { Schemas } from "@/core/api/types";

export type PricingRate = Schemas["PricingListDto"]["data"][number];
export type CreatePricingDTO = Schemas["CreatePricingDto"];
export type UpdatePricingDTO = Schemas["UpdatePricingDto"];

export type PricingProvider = PricingRate["provider"];

/** `model: "*"` = tarifa fallback del proveedor (badge violeta). */
export const FALLBACK_MODEL = "*";

export const PROVIDERS: { value: PricingProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai_compatible", label: "OpenAI compatible" },
];

export function providerLabel(provider: PricingProvider): string {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

/** ¿La tarifa está vigente? (`effective_to` null o en el futuro). */
export function isCurrentRate(rate: PricingRate, now = new Date().toISOString()): boolean {
  return rate.effective_to === null || rate.effective_to > now;
}

export type ProviderGroup = {
  provider: PricingProvider;
  rates: PricingRate[];
};

/**
 * Agrupa por proveedor y ordena cada grupo: vigentes primero, luego por
 * modelo (el fallback `*` al final de las vigentes), expiradas al fondo por
 * vigencia más reciente.
 */
export function groupByProvider(rates: PricingRate[], now = new Date().toISOString()): ProviderGroup[] {
  const groups = new Map<PricingProvider, PricingRate[]>();
  for (const rate of rates) {
    const bucket = groups.get(rate.provider) ?? [];
    bucket.push(rate);
    groups.set(rate.provider, bucket);
  }

  const sortRates = (a: PricingRate, b: PricingRate): number => {
    const aCurrent = isCurrentRate(a, now);
    const bCurrent = isCurrentRate(b, now);
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    if (aCurrent) {
      // Vigentes: fallback al final, resto alfabético por modelo.
      const aFallback = a.model === FALLBACK_MODEL;
      const bFallback = b.model === FALLBACK_MODEL;
      if (aFallback !== bFallback) return aFallback ? 1 : -1;
      return a.model.localeCompare(b.model);
    }
    // Expiradas: la de vigencia más reciente primero.
    return (b.effective_to ?? "").localeCompare(a.effective_to ?? "");
  };

  return PROVIDERS
    .filter((p) => groups.has(p.value))
    .map((p) => ({ provider: p.value, rates: [...groups.get(p.value)!].sort(sortRates) }));
}
