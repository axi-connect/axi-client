/**
 * Schema del formulario de tarifa IA. Los costos usan `z.coerce` (inputs
 * number entregan string); caché es opcional (vacío = null en el wire).
 */
import { z } from "zod";
import type { CreatePricingDTO, UpdatePricingDTO } from "../../../domain/pricing";
import { dateInputToIso } from "./pricing-format";

const positiveCost = z.coerce.number().positive("Debe ser mayor que 0");

const optionalCost = z.preprocess(
  (value) => (value === "" || value === null || value === undefined || Number.isNaN(value) ? undefined : value),
  z.coerce.number().positive("Debe ser mayor que 0").optional(),
);

export const pricingFormSchema = z.object({
  provider: z.enum(["anthropic", "openai_compatible"]),
  model: z.string().min(1, "Ingresa el modelo (o * para el fallback)"),
  input_cost_per_mtok_usd: positiveCost,
  output_cost_per_mtok_usd: positiveCost,
  cache_read_per_mtok_usd: optionalCost,
  margin_multiplier: z.coerce.number().positive("Debe ser mayor que 0"),
  effective_from: z.string().min(1, "Elige la fecha de inicio de vigencia"),
  /** Solo en edición; vacío = sigue vigente. */
  effective_to: z.string().optional(),
});

export type PricingFormValues = z.infer<typeof pricingFormSchema>;

export const defaultPricingFormValues: PricingFormValues = {
  provider: "anthropic",
  model: "",
  input_cost_per_mtok_usd: 0,
  output_cost_per_mtok_usd: 0,
  cache_read_per_mtok_usd: undefined,
  margin_multiplier: 1,
  effective_from: "",
  effective_to: "",
};

export function toCreatePricingDTO(values: PricingFormValues): CreatePricingDTO {
  return {
    provider: values.provider,
    model: values.model.trim(),
    input_cost_per_mtok_usd: values.input_cost_per_mtok_usd,
    output_cost_per_mtok_usd: values.output_cost_per_mtok_usd,
    cache_read_per_mtok_usd: values.cache_read_per_mtok_usd ?? null,
    margin_multiplier: values.margin_multiplier,
    effective_from: dateInputToIso(values.effective_from),
  };
}

export function toUpdatePricingDTO(values: PricingFormValues): UpdatePricingDTO {
  return {
    input_cost_per_mtok_usd: values.input_cost_per_mtok_usd,
    output_cost_per_mtok_usd: values.output_cost_per_mtok_usd,
    cache_read_per_mtok_usd: values.cache_read_per_mtok_usd ?? null,
    // Requerido por el DTO del PATCH: siempre viaja.
    margin_multiplier: values.margin_multiplier,
    effective_to: values.effective_to ? dateInputToIso(values.effective_to) : null,
  };
}
