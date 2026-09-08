import { parseMoneyToCents } from "@/core/lib/format";
import type {
  CreateShippingRateDTO,
  CreateShippingZoneDTO,
  ShippingRateDTO,
  ShippingZoneDTO,
  UpdateShippingRateDTO,
  UpdateShippingZoneDTO,
} from "./shipping";

/**
 * Formularios de zona y tarifa (plan envíos+promos F7) como DATOS + validación
 * PURA: la vista solo pinta y llama. Los montos se editan en pesos («12.000»)
 * y viajan en centavos; «gratis desde» son dos tarifas, no una opción.
 */
export interface ZoneFormValues {
  name: string;
  /** ISO 3166-2:CO; `[]` = resto del país (E8). */
  province_codes: string[];
  /** `CO` o «otro país» (zona internacional, sin departamentos). */
  country_code: string;
}

export interface RateFormValues {
  name: string;
  /** Texto en pesos tal como lo escribe el usuario; «0» = gratis. */
  price: string;
  min_order: string;
  max_order: string;
}

export type ZoneFormErrors = Partial<Record<keyof ZoneFormValues, string>>;
export type RateFormErrors = Partial<Record<keyof RateFormValues, string>>;

export const ZONE_NAME_MAX = 60;
export const RATE_NAME_MAX = 60;

export function defaultZoneValues(): ZoneFormValues {
  return { name: "", province_codes: [], country_code: "CO" };
}

export function zoneToFormValues(zone: ShippingZoneDTO): ZoneFormValues {
  return {
    name: zone.name,
    province_codes: [...zone.province_codes],
    country_code: zone.country_code,
  };
}

export function validateZone(values: ZoneFormValues): ZoneFormErrors {
  const errors: ZoneFormErrors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = "Ponle un nombre a la zona (p. ej. «Eje Cafetero»).";
  else if (name.length > ZONE_NAME_MAX) errors.name = `Máximo ${ZONE_NAME_MAX} caracteres.`;
  if (!/^[A-Z]{2}$/.test(values.country_code.trim().toUpperCase())) {
    errors.country_code = "Usa el código de dos letras del país (CO, US, MX…).";
  }
  return errors;
}

export function toCreateZoneDTO(values: ZoneFormValues): CreateShippingZoneDTO {
  const country = values.country_code.trim().toUpperCase();
  return {
    name: values.name.trim(),
    country_code: country,
    // Fuera de Colombia no hay catálogo de subdivisiones: la zona es todo el país.
    province_codes: country === "CO" ? [...values.province_codes] : [],
  };
}

export function toUpdateZoneDTO(values: ZoneFormValues): UpdateShippingZoneDTO {
  return toCreateZoneDTO(values);
}

export function defaultRateValues(): RateFormValues {
  return { name: "", price: "", min_order: "", max_order: "" };
}

export function rateToFormValues(rate: ShippingRateDTO): RateFormValues {
  return {
    name: rate.name,
    price: rate.price_cents === null ? "" : centsToInput(rate.price_cents),
    min_order: rate.min_order_cents === null ? "" : centsToInput(rate.min_order_cents),
    max_order: rate.max_order_cents === null ? "" : centsToInput(rate.max_order_cents),
  };
}

export function validateRate(values: RateFormValues): RateFormErrors {
  const errors: RateFormErrors = {};
  const name = values.name.trim();
  if (name.length === 0) errors.name = "Ponle un nombre a la tarifa (p. ej. «Envío estándar»).";
  else if (name.length > RATE_NAME_MAX) errors.name = `Máximo ${RATE_NAME_MAX} caracteres.`;

  const price = moneyOrNull(values.price);
  if (price === null || price < 0) {
    errors.price = "Escribe el precio en pesos. Pon 0 si el envío es gratis.";
  }
  const min = optionalMoney(values.min_order);
  const max = optionalMoney(values.max_order);
  if (min === undefined) errors.min_order = "Monto inválido: usa solo números (p. ej. 150.000).";
  if (max === undefined) errors.max_order = "Monto inválido: usa solo números (p. ej. 149.999).";
  if (min !== undefined && max !== undefined && min !== null && max !== null && min > max) {
    errors.max_order = "El «hasta» debe ser mayor o igual que el «desde».";
  }
  return errors;
}

export function toCreateRateDTO(values: RateFormValues): CreateShippingRateDTO {
  return {
    name: values.name.trim(),
    price_cents: moneyOrNull(values.price) ?? 0,
    min_order_cents: optionalMoney(values.min_order) ?? null,
    max_order_cents: optionalMoney(values.max_order) ?? null,
  };
}

export function toUpdateRateDTO(values: RateFormValues): UpdateShippingRateDTO {
  return toCreateRateDTO(values);
}

/** `""` → null (sin condición); inválido → undefined. */
function optionalMoney(input: string): number | null | undefined {
  if (input.trim() === "") return null;
  const cents = parseMoneyToCents(input);
  return cents === null || cents < 0 ? undefined : cents;
}

function moneyOrNull(input: string): number | null {
  if (input.trim() === "") return null;
  return parseMoneyToCents(input);
}

function centsToInput(cents: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(cents / 100);
}
