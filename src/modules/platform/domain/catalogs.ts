/**
 * Catálogos estáticos del alta de tenants (configuración por datos: los
 * selects del wizard interpretan estas tablas; ampliar un país = una línea).
 * La moneda y la zona horaria por defecto se derivan del país elegido.
 */
export type CountryOption = {
  code: string;
  name: string;
  currency: string;
  currencyLabel: string;
  timezone: string;
};

export const COUNTRIES: CountryOption[] = [
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

export const INDUSTRIES = [
  "Retail",
  "Alimentos y bebidas",
  "Salud",
  "Educación",
  "Servicios financieros",
  "Tecnología",
  "Turismo",
  "Logística",
  "Inmobiliaria",
  "Otro",
] as const;
