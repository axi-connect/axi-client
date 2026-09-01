import type { Schemas } from "@/core/api/types";

/**
 * El vocabulario de «qué datos debe tener un lead», compartido por las DOS
 * pantallas que lo preguntan.
 *
 * Vivía en `domain/search.ts`, y ahí estaba mal: no es de búsqueda ni de lead,
 * es del slice. Los criterios de admisión de una búsqueda y los filtros de la
 * bandeja hacen la misma pregunta —cuántos de los cinco datos, qué datos
 * exiges, qué calidad mínima— y dos pantallas preguntando lo mismo con dos
 * listas de palabras acaban divergiendo siempre. Este módulo ya se paga solo:
 * en el backend, la misma regla en dos sitios llegó a producción contando
 * `website ?? domain` en uno y `website` en el otro.
 *
 * **Se movió SIN reexportar desde `search.ts`.** Un reexporte deja dos puertas
 * al mismo símbolo y en dos semanas nadie sabe cuál es la buena.
 *
 * TypeScript puro: ni React ni HTTP.
 */

type AdmissionParams = NonNullable<Schemas["SearchDto"]["params"]["admission"]>;

/**
 * Los datos que se pueden exigir de uno en uno.
 *
 * Se derivan del contrato, así que ampliar la lista en el backend rompe la
 * compilación aquí hasta que se le dé etiqueta — que es lo que se quiere. Son
 * SEIS y no las nueve redes: `linkedin`, `tiktok` y `whatsapp` se cuentan como
 * dato pero no se pueden exigir todavía, porque nadie lo ha pedido. Contar un
 * dato y poder filtrar por él son decisiones distintas.
 */
export type RequirableField = NonNullable<AdmissionParams["require"]>[number];

/** Cuántos datos cuenta la completitud. Espeja `ADMISSION_DATA_FIELDS` del backend. */
export const ADMISSION_DATA_FIELDS = 5;

/**
 * Umbrales que ofrece la interfaz.
 *
 * Pasos y no un deslizador libre, por la misma razón que los radios: nadie
 * distingue un 43 de un 47, y un deslizador promete esa precisión. La etiqueta
 * dice qué significa el número, que es lo que de verdad se elige.
 */
export const SCORE_STEPS = [
  { value: null, label: "Cualquiera" },
  { value: 40, label: "40 o más · aprovechable" },
  { value: 60, label: "60 o más · bueno" },
  { value: 80, label: "80 o más · excelente" },
] as const;

/** El techo del rango, para cuando se busca lo flojo a propósito. */
export const SCORE_CEILINGS = [
  { value: null, label: "Sin techo" },
  { value: 39, label: "Menos de 40" },
  { value: 59, label: "Menos de 60" },
  { value: 79, label: "Menos de 80" },
] as const;

export const REQUIRABLE_LABELS: Record<RequirableField, string> = {
  phone: "Teléfono",
  email: "Correo",
  website: "Sitio web",
  address: "Dirección",
  instagram: "Instagram",
  facebook: "Facebook",
};

/** El orden en que se ofrecen. Instagram primero porque es el que más se pide. */
export const REQUIRABLE_ORDER: RequirableField[] = [
  "instagram",
  "phone",
  "email",
  "website",
  "address",
  "facebook",
];
