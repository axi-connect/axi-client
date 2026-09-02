/**
 * Catálogos estáticos del alta de tenants (configuración por datos: los
 * selects del wizard interpretan estas tablas; ampliar un país = una línea).
 * La moneda y la zona horaria por defecto se derivan del país elegido.
 */
// Países: promovidos a `shared/data/countries.ts` (los consume también el
// registro autoservicio). Se re-exportan para no tocar a los consumidores.
export { COUNTRIES, countryByCode, type CountryOption } from "@/shared/data/countries";

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
