/**
 * «Completar con la web del negocio» (plan `captacion_enriquecimiento_al_contacto.md`, Fase 2;
 * mockup `docs/design/mockups/forms-fill-from-web.*`).
 *
 * Qué datos de un formulario de captura puede leer la IA en la web de un negocio. Es ESPEJO de
 * `fillableFields` del servidor (`prospecting/application/form_fill/form_fill.ts`): si allá cambia
 * la regla, aquí también, o la tarjeta prometería datos que el servidor nunca llena.
 *
 * Puro: sin React, sin red.
 */

export interface FormFieldLike {
  code: string;
  label: string;
  type: string;
}

/** Teléfono, correo y fechas de un formulario de registro son de la PERSONA, no del negocio. */
const PERSONAL_TYPES: ReadonlySet<string> = new Set(["phone", "email", "date"]);

/** Mismas palabras que el servidor, sin tildes y en minúsculas. */
const PERSONAL_WORDS =
  /(cumple|nacimiento|cedula|documento|identificacion|\bdni\b|pasaporte|\bedad\b|genero|\bsexo\b|estado civil|hijos|nombre|apellido|domicilio|direccion|barrio|correo|e-?mail|telefono|celular|whatsapp|salario|ingreso|profesion|ocupacion|cargo)/;

function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿Este dato lo puede leer la IA en la web del negocio? (si no, solo lo da el cliente). */
export function isWebFillableField(field: FormFieldLike): boolean {
  if (PERSONAL_TYPES.has(field.type)) return false;
  return !PERSONAL_WORDS.test(fold(`${field.code.replace(/_/g, " ")} ${field.label}`));
}

export function splitWebFillable<T extends FormFieldLike>(
  fields: readonly T[],
): { web: T[]; personal: T[] } {
  const web: T[] = [];
  const personal: T[] = [];
  for (const field of fields) (isWebFillableField(field) ? web : personal).push(field);
  return { web, personal };
}
