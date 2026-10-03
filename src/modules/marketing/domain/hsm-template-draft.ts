import type { HsmFormStep } from "@/modules/marketing/domain/meta-template-view";
import {
  inspectTemplateVariables,
  TEMPLATE_VARIABLE_MESSAGES,
} from "@/modules/marketing/domain/template-catalog";
import { isValidTemplateName } from "@/modules/marketing/domain/template-name";
import {
  BODY_MAX,
  hasIncompleteButton,
  type TemplateButton,
} from "@/modules/marketing/domain/template-pieces";

/** Lo que el formulario de una plantilla de Meta lleva escrito, antes de mandarlo. */
export interface HsmTemplateDraft {
  /** La base del nombre, ya en el formato de Meta (`formatTemplateBase`). */
  base: string;
  /** El nombre completo que se enviaría: base + `_vN`. */
  name: string;
  body: string;
  examples: readonly string[];
  /** La cabecera de TEXTO; una de medio va en `headerMedia`. */
  header: string | null;
  /**
   * La cabecera de imagen, video o documento, si es la elegida: `ready` cuando
   * ya hay archivo subido (o el guardado con la plantilla), `uploading` mientras
   * sube. Sin archivo no se envía: se aprobaría y no se podría mandar.
   */
  headerMedia?: { ready: boolean; uploading: boolean } | null;
  footer: string | null;
  buttons: readonly TemplateButton[];
}

export type HsmDraftField = "name" | "body" | "examples" | "header" | "footer" | "buttons";

/** Qué falta o está mal, campo a campo, en la frase que se le enseña al operador. */
export type HsmDraftErrors = Partial<Record<HsmDraftField, string>>;

/** En qué paso de la página vive cada campo: es el que se abre si hay un error ahí. */
export const STEP_OF_FIELD: Record<HsmDraftField, HsmFormStep> = {
  name: "ficha",
  body: "message",
  examples: "message",
  header: "message",
  footer: "message",
  buttons: "message",
};

/**
 * Las reglas que Meta revisaría, comprobadas antes de gastar el envío. Son las
 * de la modal que la página reemplaza, sacadas aquí para que la página y sus
 * tests compartan una sola definición.
 */
export function hsmDraftErrors(draft: HsmTemplateDraft): HsmDraftErrors {
  const verdict = inspectTemplateVariables(draft.body);
  const variableCount = verdict.ok ? verdict.count : 0;
  const errors: HsmDraftErrors = {};

  if (draft.base === "") errors.name = "Escribe un nombre para reconocerla";
  else if (!isValidTemplateName(draft.name)) errors.name = "El nombre es muy corto: usa al menos 3 letras";

  if (draft.body.trim().length < 10) errors.body = "Escribe al menos 10 caracteres";
  else if (draft.body.length > BODY_MAX) errors.body = `Máximo ${String(BODY_MAX)} caracteres`;
  else if (!verdict.ok) errors.body = TEMPLATE_VARIABLE_MESSAGES[verdict.reason];

  const missing = firstMissingExample(draft.examples, variableCount);
  if (missing !== null) errors.examples = `Meta exige un ejemplo por cada variable: falta el de {{${String(missing)}}}`;

  if (draft.header !== null && draft.header.trim() === "") errors.header = "Escribe la cabecera o quítala";
  if (draft.headerMedia && !draft.headerMedia.ready) {
    errors.header = draft.headerMedia.uploading
      ? "Espera a que termine de subir el archivo de la cabecera"
      : "Sube el archivo de la cabecera o quítala";
  }
  if (draft.footer !== null && draft.footer.trim() === "") errors.footer = "Escribe el pie o quítalo";
  if (hasIncompleteButton([...draft.buttons])) errors.buttons = "Completa cada botón o quítalo";

  return errors;
}

/** El primer `{{n}}` sin ejemplo (1-based), o `null` si están todos. */
export function firstMissingExample(examples: readonly string[], variableCount: number): number | null {
  for (let index = 0; index < variableCount; index += 1) {
    if (!examples[index]?.trim()) return index + 1;
  }
  return null;
}

/** Qué pasos tienen algún error: es lo que pinta la marca «!» y lo que se abre al enviar. */
export function stepsWithErrors(errors: HsmDraftErrors): ReadonlySet<HsmFormStep> {
  const steps = new Set<HsmFormStep>();
  for (const field of Object.keys(errors) as HsmDraftField[]) {
    if (errors[field] !== undefined) steps.add(STEP_OF_FIELD[field]);
  }
  return steps;
}
