/**
 * Plantillas de mensaje con variables.
 *
 * ESPEJO EXACTO de `template_renderer.ts` del backend (catálogo, patrón de
 * placeholder y normalización incluidos). Se replica a propósito y no se
 * aproxima: la vista previa del editor tiene que enseñar EXACTAMENTE lo que le
 * llegará al cliente, incluido cómo se cierran los huecos cuando una variable
 * no tiene dato. Una previsualización que miente es peor que no tenerla.
 *
 * Si el backend amplía el catálogo, este archivo se actualiza con él: el
 * validador de aquí solo evita un 422 evitable, la autoridad sigue siendo el
 * servidor.
 */

export const TEMPLATE_VARIABLES = [
  "contact_name",
  "first_name",
  "product",
  "cart_total",
  "coupon_code",
  "discount",
  "gift_product",
  "expires_at",
  "company_name",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export type TemplateValues = Partial<Record<TemplateVariable, string>>;

export const MAX_MESSAGE_TEMPLATE_LENGTH = 1000;
export const MIN_MESSAGE_TEMPLATE_LENGTH = 10;

/** Qué representa cada variable, para los chips del editor. */
export const TEMPLATE_VARIABLE_LABELS: Record<TemplateVariable, string> = {
  contact_name: "Nombre completo del contacto",
  first_name: "Primer nombre",
  product: "Producto del carrito",
  cart_total: "Total del carrito",
  coupon_code: "Código del cupón",
  discount: "Descuento de la promoción",
  gift_product: "Producto de regalo",
  expires_at: "Cuándo vence el cupón",
  company_name: "Nombre de tu empresa",
};

/**
 * En CAMPAÑAS solo se rellenan estas tres: no hay cupón por destinatario ni
 * carrito asociado. Ofrecer las otras seis en el editor de una campaña sería
 * prometer datos que el render va a borrar.
 */
export const CAMPAIGN_TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  "contact_name",
  "first_name",
  "company_name",
] as const;

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Nombres de variable que la plantilla referencia (normalizados, únicos). */
export function extractTemplateVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    found.add((match[1] ?? "").toLowerCase());
  }
  return [...found];
}

/** Variables referenciadas que NO están en el catálogo (el backend da 422). */
export function invalidTemplateVariables(body: string): string[] {
  const allowed = new Set<string>(TEMPLATE_VARIABLES);
  return extractTemplateVariables(body).filter((name) => !allowed.has(name));
}

/**
 * Variables válidas pero que en ESTE contexto no se van a rellenar. No es un
 * error del backend: el mensaje sale igual, solo que sin ellas. La UI lo avisa
 * para que el usuario no escriba un texto que quedará cojo.
 */
export function unfilledTemplateVariables(
  body: string,
  available: readonly TemplateVariable[],
): string[] {
  const allowed = new Set<string>(TEMPLATE_VARIABLES);
  const usable = new Set<string>(available);
  return extractTemplateVariables(body).filter(
    (name) => allowed.has(name) && !usable.has(name),
  );
}

/**
 * Sustituye las variables por sus valores. Un valor ausente o vacío borra el
 * placeholder y colapsa el espacio sobrante: al cliente jamás le llega un
 * `{{...}}` crudo ni un doble espacio.
 */
export function renderTemplate(body: string, values: TemplateValues): string {
  const rendered = body.replace(PLACEHOLDER_PATTERN, (_match, rawName: string) => {
    const value = values[rawName.toLowerCase() as TemplateVariable];
    if (value === undefined) return "";
    // Un valor no controla el layout del mensaje: sin saltos propios.
    return value.replace(/\s+/g, " ").trim();
  });
  return rendered
    .replace(/[^\S\n]+/g, " ")
    .replace(/[^\S\n]+([.,;:!?])/g, "$1")
    .replace(/[^\S\n]*\n[^\S\n]*/g, "\n")
    .trim();
}

/** Datos de ejemplo de la vista previa. Creíbles y en es-CO. */
export const PREVIEW_VALUES: TemplateValues = {
  contact_name: "Ana Pérez",
  first_name: "Ana",
  product: "Camiseta básica",
  cart_total: "$ 132.000",
  coupon_code: "VUELVE10",
  discount: "25%",
  gift_product: "Camiseta básica · Talla M",
  expires_at: "hoy a las 6:04 p. m.",
  company_name: "Joao's Burguer",
};

/** Vista previa con los datos de ejemplo, limitada a las variables del contexto. */
export function previewTemplate(
  body: string,
  available: readonly TemplateVariable[] = TEMPLATE_VARIABLES,
): string {
  const usable = new Set<string>(available);
  const values: TemplateValues = {};
  for (const key of Object.keys(PREVIEW_VALUES) as TemplateVariable[]) {
    if (usable.has(key)) values[key] = PREVIEW_VALUES[key];
  }
  return renderTemplate(body, values);
}
