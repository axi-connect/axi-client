/**
 * Schema y mappers del editor de formularios de captura (F10).
 *
 * El schema es espejo de `forms/application/ports/form_fields.schema.ts` del
 * backend: los mismos topes, el mismo regex y el mismo refine de
 * select↔options. Así el 400 del `ZodValidationPipe` global queda como red de
 * seguridad ante drift, no como el camino normal.
 *
 * Nota de diseño: NO se usa `zodResolver` en la raíz del formulario. El editor
 * mantiene los tres flujos en un único `useForm` (para que cambiar de pestaña
 * no pierda el borrador), pero la escritura es por flujo (`PUT /forms/{flow}`).
 * Un resolver raíz bloquearía guardar el flujo activo por un error en otro
 * flujo, así que la validación se hace con `flowIssues()` sobre el flujo que se
 * está guardando y sus paths se aplican con `form.setError`.
 */
import { z } from "zod";
import {
  FIELD_CODE_REGEX,
  FIELD_LIMITS,
  FORM_FLOWS,
  MAX_FIELDS_PER_FORM,
  MAX_OPTIONS_PER_FIELD,
  type EditableFormField,
  type FlowForm,
  type FormFieldType,
  type FormFlow,
} from "@/modules/forms/domain/form";
import type { UpsertFormInput } from "@/modules/forms/infrastructure/services/form-service.adapter";

const formFieldValueSchema = z
  .object({
    code: z
      .string()
      .min(1, "Ponle una clave a este dato")
      .max(FIELD_LIMITS.code, `Máximo ${FIELD_LIMITS.code} caracteres`)
      .regex(
        FIELD_CODE_REGEX,
        "La clave debe empezar por una letra y llevar solo minúsculas, números y guiones bajos",
      ),
    label: z
      .string()
      .trim()
      .min(1, "Ponle un nombre a este dato")
      .max(FIELD_LIMITS.label, `El nombre no puede pasar de ${FIELD_LIMITS.label} caracteres`),
    type: z.enum(["text", "number", "select", "date", "boolean", "phone", "email"]),
    required: z.boolean(),
    options: z
      .array(z.string().trim().min(1).max(FIELD_LIMITS.option, `Máximo ${FIELD_LIMITS.option} caracteres por opción`))
      .max(MAX_OPTIONS_PER_FIELD, `Máximo ${MAX_OPTIONS_PER_FIELD} opciones`)
      .optional(),
    ai_prompt: z
      .string()
      .trim()
      .max(FIELD_LIMITS.aiPrompt, `La indicación para la IA no puede pasar de ${FIELD_LIMITS.aiPrompt} caracteres`)
      .optional(),
    persisted: z.boolean(),
    key: z.string(),
  })
  .superRefine((field, ctx) => {
    // Espejo del superRefine del backend, pero SOLO la dirección que el usuario
    // puede violar: un select sin opciones. La regla recíproca ("options
    // prohibido si type ≠ select") NO se valida a propósito: si el usuario pasa
    // una fila de select a texto, ver un error rojo por opciones residuales
    // sería absurdo. El estado local las conserva (para no perderlas al volver
    // a select) y `toUpsertDto` las descarta en la frontera del wire.
    if (field.type === "select" && (field.options?.filter((opt) => opt.trim() !== "").length ?? 0) === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Una lista de opciones necesita al menos una opción",
      });
    }
  });

export const formDefinitionSchema = z.object({
  is_active: z.boolean(),
  fields: z
    .array(formFieldValueSchema)
    .max(MAX_FIELDS_PER_FORM, `Máximo ${MAX_FIELDS_PER_FORM} datos por flujo`)
    .superRefine((fields, ctx) => {
      const seen = new Set<string>();
      fields.forEach((field, index) => {
        if (field.code === "") return;
        if (seen.has(field.code)) {
          // El path lleva el ÍNDICE para que el error se pinte en el input de
          // ESA fila (`fields.3.code`), no como un toast genérico.
          ctx.addIssue({
            code: "custom",
            path: [index, "code"],
            message: `La clave «${field.code}» ya la usa otro dato de este flujo`,
          });
        }
        seen.add(field.code);
      });
    }),
});

export type FormDefinitionValues = z.infer<typeof formDefinitionSchema>;

/** Valores del `useForm` raíz: los tres flujos a la vez. */
export type FormsValues = Record<FormFlow, FormDefinitionValues>;

/**
 * `FormField` no trae id, así que la clave de render se genera. Con contador de
 * respaldo: `crypto.randomUUID` exige contexto seguro y el fallo sería un
 * remount silencioso de las filas.
 */
let fallbackKeySeq = 0;
function fieldKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  fallbackKeySeq += 1;
  return `field-${fallbackKeySeq}`;
}

/** Campo nuevo, con los defaults del editor. `persisted: false` ⇒ el code es editable. */
export function newEditableField(preset: Partial<EditableFormField> = {}): EditableFormField {
  const type: FormFieldType = preset.type ?? "text";
  return {
    code: preset.code ?? "",
    label: preset.label ?? "",
    type,
    required: preset.required ?? true,
    options: type === "select" ? (preset.options ?? [""]) : preset.options,
    ai_prompt: preset.ai_prompt,
    persisted: false,
    key: fieldKey(),
  };
}

/**
 * DTO (o borrador sintetizado) → valores del editor. Ordena por `position` y
 * marca cada campo como `persisted` para bloquear su `code`.
 */
export function fromDto(form: FlowForm): FormDefinitionValues {
  return {
    is_active: form.is_active,
    fields: [...form.fields]
      .sort((a, b) => a.position - b.position)
      .map((field) => ({
        code: field.code,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
        ai_prompt: field.ai_prompt,
        persisted: true,
        key: fieldKey(),
      })),
  };
}

export function toFormsValues(forms: Record<FormFlow, FlowForm>): FormsValues {
  return FORM_FLOWS.reduce((acc, flow) => {
    acc[flow] = fromDto(forms[flow]);
    return acc;
  }, {} as FormsValues);
}

/**
 * Valores del editor → cuerpo del PUT. Tres trampas del contrato, cubiertas:
 *
 * 1. `position` se deriva del índice (contiguo desde 0): nunca hay duplicados
 *    ni huecos, y reordenar es solo mover en el array.
 * 2. `options` viaja SOLO si el tipo es `select` (el backend lo rechaza en el
 *    resto), y se descartan las opciones vacías.
 * 3. `ai_prompt` se OMITE si está vacío: el backend exige `min(1)` cuando el
 *    campo está presente, así que enviar `""` es un 400.
 *
 * `is_active` viaja SIEMPRE — ver el comentario del adapter.
 */
export function toUpsertDto(values: FormDefinitionValues): UpsertFormInput {
  return {
    is_active: values.is_active,
    fields: values.fields.map((field, index) => {
      const options = (field.options ?? []).map((opt) => opt.trim()).filter((opt) => opt !== "");
      const aiPrompt = field.ai_prompt?.trim();
      return {
        code: field.code,
        label: field.label.trim(),
        type: field.type,
        required: field.required,
        position: index,
        ...(field.type === "select" ? { options } : {}),
        ...(aiPrompt !== undefined && aiPrompt !== "" ? { ai_prompt: aiPrompt } : {}),
      };
    }),
  };
}

/** Issue de validación con el path ya listo para `form.setError` del editor. */
export type FlowIssue = { path: string; message: string };

/**
 * Valida un flujo y devuelve sus issues con el path prefijado por el flujo
 * (`order_intake.fields.2.code`), listo para `form.setError`. Devuelve `[]` si
 * el flujo es válido.
 */
export function flowIssues(values: FormDefinitionValues, flow: FormFlow): FlowIssue[] {
  const result = formDefinitionSchema.safeParse(values);
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    path: [flow, ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
}
