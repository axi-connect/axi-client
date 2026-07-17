/**
 * Schema del formulario de plan (crear/editar). Las invariantes del set de
 * límites se validan con `validateLimits` (dominio) vía `superRefine` — el
 * submit se bloquea con los mismos mensajes que muestra el editor en vivo.
 */
import { z } from "zod";
import {
  PLAN_CODE_REGEX,
  validateLimits,
  type LimitInput,
} from "../../../domain/limits";

export const planFormSchema = z.object({
  code: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .regex(PLAN_CODE_REGEX, "Solo minúsculas, números y guion bajo; empieza por letra"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
  tier: z.enum(["sbs", "enterprise"]),
  default_limits: z
    .array(z.custom<LimitInput>())
    .superRefine((limits, ctx) => {
      for (const issue of validateLimits(limits)) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.row >= 0 ? [issue.row] : [],
        });
      }
    }),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

export const defaultPlanFormValues: PlanFormValues = {
  code: "",
  name: "",
  description: "",
  tier: "sbs",
  default_limits: [],
};
