/**
 * Schema del formulario de suite (metadatos crear/editar). La composición de
 * escenarios va aparte (`SuiteScenariosSheet`, PUT de reemplazo total).
 */
import { z } from "zod";
import {
  CODE_MAX,
  CODE_MIN,
  DESCRIPTION_MAX,
  NAME_MAX,
  NAME_MIN,
  SCENARIO_CODE_REGEX,
  type CreateSuiteDTO,
  type SuiteListItem,
  type UpdateSuiteDTO,
} from "../../../../domain/quality";

export const suiteFormSchema = z.object({
  code: z
    .string()
    .min(CODE_MIN, `Mínimo ${CODE_MIN} caracteres`)
    .max(CODE_MAX, `Máximo ${CODE_MAX} caracteres`)
    .regex(SCENARIO_CODE_REGEX, "Solo minúsculas, números y guion bajo; empieza por letra"),
  name: z.string().min(NAME_MIN, `Mínimo ${NAME_MIN} caracteres`).max(NAME_MAX, `Máximo ${NAME_MAX} caracteres`),
  description: z.string().max(DESCRIPTION_MAX, `Máximo ${DESCRIPTION_MAX} caracteres`).optional(),
});

export type SuiteFormValues = z.infer<typeof suiteFormSchema>;

export const defaultSuiteFormValues: SuiteFormValues = {
  code: "",
  name: "",
  description: "",
};

export function suiteToFormValues(suite: SuiteListItem): SuiteFormValues {
  return {
    code: suite.code,
    name: suite.name,
    description: suite.description ?? "",
  };
}

export function toCreateSuiteDTO(values: SuiteFormValues): CreateSuiteDTO {
  return {
    code: values.code,
    name: values.name,
    ...(values.description?.trim() ? { description: values.description.trim() } : {}),
  };
}

/** El PATCH no acepta `code`. */
export function toUpdateSuiteDTO(values: SuiteFormValues): UpdateSuiteDTO {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
  };
}
