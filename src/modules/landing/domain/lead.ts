/**
 * Dominio del slice `landing`: contrato del lead de demo.
 * TypeScript puro — sin React, sin http, sin zod (arquitectura §3.2).
 */

/**
 * Rangos del selector "¿Cuántas conversaciones maneja tu negocio al mes?".
 *
 * Son los MISMOS cortes que el estimador de la página de precios (500, 1.500,
 * 4.000). Antes eran otros —300, 1.000, 3.000— heredados del catálogo de dos
 * tramos, así que un visitante declaraba un volumen en el formulario y veía
 * otra escala al mirar los planes.
 */
export const MONTHLY_CONVERSATION_RANGES = [
  "lt_500",
  "500_1500",
  "1500_4000",
  "gt_4000",
  "unknown",
] as const;

export type MonthlyConversationRange = (typeof MONTHLY_CONVERSATION_RANGES)[number];

/**
 * Lo que el visitante rellenó. Viaja al backend dentro de `payload`, que es un
 * mapa genérico a propósito: el endpoint sirve a cualquier formulario de
 * cualquier tenant, y fijar allí esta lista obligaría a tocar el servidor cada
 * vez que alguien añade una pregunta.
 */
export interface DemoLeadPayload {
  name: string;
  business_name: string;
  whatsapp: string;
  monthly_conversations: MonthlyConversationRange;
}

/**
 * Clave pública del formulario de demo de axi. No es un secreto —está en el
 * HTML de una página pública— y no autoriza nada: solo le dice al backend a
 * qué tenant entra el envío.
 */
export const DEMO_FORM_PUBLIC_KEY = "axi-demo-9f4c21b8";
