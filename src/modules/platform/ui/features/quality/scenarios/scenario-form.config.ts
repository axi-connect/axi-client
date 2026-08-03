/**
 * Schema del formulario de escenario (crear/editar). Límites espejo de los
 * DTOs zod del backend (domain/quality.ts); las reglas cruzadas de los
 * criterios van por `validateCriteriaSet` en `superRefine` — mismos mensajes
 * que muestra el editor en vivo. `tags` se edita como texto separado por
 * comas y se normaliza al construir el DTO.
 */
import { z } from "zod";
import {
  CODE_MAX,
  CODE_MIN,
  DEFAULT_MAX_TURNS,
  DESCRIPTION_MAX,
  GOAL_MAX,
  GOAL_MIN,
  MAX_TAGS,
  MAX_TURNS_MAX,
  MAX_TURNS_MIN,
  NAME_MAX,
  NAME_MIN,
  parseSuccessCriteria,
  PERSONA_MAX,
  PERSONA_MIN,
  SCENARIO_CODE_REGEX,
  TAG_MAX_LENGTH,
  validateCriteriaSet,
  type CreateScenarioDTO,
  type Scenario,
  type SuccessCriterion,
  type UpdateScenarioDTO,
} from "../../../../domain/quality";

/** "ventas, retención" → ["ventas", "retención"] (trim + dedupe, sin vacíos). */
export function parseTagsInput(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export const scenarioFormSchema = z.object({
  code: z
    .string()
    .min(CODE_MIN, `Mínimo ${CODE_MIN} caracteres`)
    .max(CODE_MAX, `Máximo ${CODE_MAX} caracteres`)
    .regex(SCENARIO_CODE_REGEX, "Solo minúsculas, números y guion bajo; empieza por letra"),
  name: z.string().min(NAME_MIN, `Mínimo ${NAME_MIN} caracteres`).max(NAME_MAX, `Máximo ${NAME_MAX} caracteres`),
  description: z.string().max(DESCRIPTION_MAX, `Máximo ${DESCRIPTION_MAX} caracteres`).optional(),
  persona: z
    .string()
    .min(PERSONA_MIN, `Mínimo ${PERSONA_MIN} caracteres`)
    .max(PERSONA_MAX, `Máximo ${PERSONA_MAX} caracteres`),
  goal: z.string().min(GOAL_MIN, `Mínimo ${GOAL_MIN} caracteres`).max(GOAL_MAX, `Máximo ${GOAL_MAX} caracteres`),
  max_turns: z.coerce
    .number({ message: "Ingresa un número" })
    .int("Debe ser un entero")
    .min(MAX_TURNS_MIN, `Mínimo ${MAX_TURNS_MIN}`)
    .max(MAX_TURNS_MAX, `Máximo ${MAX_TURNS_MAX}`),
  tags: z.string().superRefine((value, ctx) => {
    const tags = parseTagsInput(value);
    if (tags.length > MAX_TAGS) {
      ctx.addIssue({ code: "custom", message: `Máximo ${MAX_TAGS} etiquetas` });
    }
    if (tags.some((tag) => tag.length > TAG_MAX_LENGTH)) {
      ctx.addIssue({ code: "custom", message: `Cada etiqueta admite máximo ${TAG_MAX_LENGTH} caracteres` });
    }
  }),
  success_criteria: z.array(z.custom<SuccessCriterion>()).superRefine((criteria, ctx) => {
    for (const message of validateCriteriaSet(criteria)) {
      ctx.addIssue({ code: "custom", message });
    }
  }),
});

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

export const defaultScenarioFormValues: ScenarioFormValues = {
  code: "",
  name: "",
  description: "",
  persona: "",
  goal: "",
  max_turns: DEFAULT_MAX_TURNS,
  tags: "",
  success_criteria: [],
};

export function scenarioToFormValues(scenario: Scenario): ScenarioFormValues {
  return {
    code: scenario.code,
    name: scenario.name,
    description: scenario.description ?? "",
    persona: scenario.persona,
    goal: scenario.goal,
    max_turns: scenario.max_turns,
    tags: scenario.tags.join(", "),
    success_criteria: parseSuccessCriteria(scenario.success_criteria),
  };
}

/**
 * Los criterios `unknown` (no reconocidos por esta versión del editor) no
 * son expresables en el DTO de escritura: se excluyen al guardar (el editor
 * lo advierte en la fila).
 */
function toWireCriteria(criteria: SuccessCriterion[]): CreateScenarioDTO["success_criteria"] {
  return criteria.filter((c) => c.kind !== "unknown") as CreateScenarioDTO["success_criteria"];
}

export function toCreateScenarioDTO(values: ScenarioFormValues): CreateScenarioDTO {
  return {
    code: values.code,
    name: values.name,
    ...(values.description?.trim() ? { description: values.description.trim() } : {}),
    persona: values.persona,
    goal: values.goal,
    max_turns: values.max_turns,
    tags: parseTagsInput(values.tags),
    success_criteria: toWireCriteria(values.success_criteria),
  };
}

/** El PATCH no acepta `code`; `max_turns` y `tags` son requeridos por el DTO. */
export function toUpdateScenarioDTO(values: ScenarioFormValues): UpdateScenarioDTO {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
    persona: values.persona,
    goal: values.goal,
    max_turns: values.max_turns,
    tags: parseTagsInput(values.tags),
    success_criteria: toWireCriteria(values.success_criteria),
  };
}
