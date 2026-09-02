/**
 * Catálogo de países del alta de empresas (configuración por datos: los selects
 * interpretan esta tabla; ampliar un país = una línea). La moneda y la zona
 * horaria por defecto se derivan del país elegido.
 *
 * Vive en `shared/` porque lo consumen dos superficies que no pueden importarse
 * entre sí: el wizard de alta de la consola `/platform` y el registro
 * autoservicio `/comenzar` (slice `onboarding`). Antes era
 * `modules/platform/domain/catalogs.ts`, que lo re-exporta por compatibilidad.
 */
export type CountryOption = {
  code: string;
  name: string;
  currency: string;
  currencyLabel: string;
  timezone: string;
};

export const COUNTRIES: readonly CountryOption[] = [
  { code: "CO", name: "Colombia", currency: "COP", currencyLabel: "COP — peso colombiano", timezone: "America/Bogota" },
  { code: "MX", name: "México", currency: "MXN", currencyLabel: "MXN — peso mexicano", timezone: "America/Mexico_City" },
  { code: "AR", name: "Argentina", currency: "ARS", currencyLabel: "ARS — peso argentino", timezone: "America/Argentina/Buenos_Aires" },
  { code: "CL", name: "Chile", currency: "CLP", currencyLabel: "CLP — peso chileno", timezone: "America/Santiago" },
  { code: "PE", name: "Perú", currency: "PEN", currencyLabel: "PEN — sol peruano", timezone: "America/Lima" },
  { code: "EC", name: "Ecuador", currency: "USD", currencyLabel: "USD — dólar estadounidense", timezone: "America/Guayaquil" },
  { code: "PA", name: "Panamá", currency: "PAB", currencyLabel: "PAB — balboa", timezone: "America/Panama" },
  { code: "US", name: "Estados Unidos", currency: "USD", currencyLabel: "USD — dólar estadounidense", timezone: "America/New_York" },
  { code: "ES", name: "España", currency: "EUR", currencyLabel: "EUR — euro", timezone: "Europe/Madrid" },
];

export function countryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
