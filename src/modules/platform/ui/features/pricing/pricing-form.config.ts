/**
 * Schema del formulario de tarifa IA. Los costos usan `z.coerce` (inputs
 * number entregan string); caché es opcional (vacío = null en el wire).
 *
 * Unidad (§10.5 F3): la tarifa es "USD por millón de <unidad>". Para
 * `characters` (voz) el costo vive en ENTRADA y salida/caché no aplican:
 * el form las fuerza a 0/null y el schema no exige salida positiva.
 */
import { z } from "zod";
import type { CreatePricingDTO, UpdatePricingDTO } from "../../../domain/pricing";
import { dateInputToIso } from "./pricing-format";

const positiveCost = z.coerce.number().positive("Debe ser mayor que 0");

const optionalCost = z.preprocess(
  (value) => (value === "" || value === null || value === undefined || Number.isNaN(value) ? undefined : value),
  z.coerce.number().positive("Debe ser mayor que 0").optional(),
);

export const pricingFormSchema = z
  .object({
    provider: z.enum(["anthropic", "openai_compatible", "elevenlabs", "twilio"]),
    unit: z.enum(["tokens", "characters", "seconds", "requests"]),
    model: z.string().min(1, "Ingresa el modelo (o * para el fallback)"),
    /** Nombre que verá el tenant en el selector de modelos del agente. */
    display_name: z.string().optional(),
    /** Modelo preseleccionado del proveedor (único: el backend desmarca el resto). */
    is_default: z.boolean(),
    input_cost_per_mtok_usd: positiveCost,
    output_cost_per_mtok_usd: z.coerce.number().min(0, "No puede ser negativo"),
    cache_read_per_mtok_usd: optionalCost,
    margin_multiplier: z.coerce.number().positive("Debe ser mayor que 0"),
    effective_from: z.string().min(1, "Elige la fecha de inicio de vigencia"),
    /** Solo en edición; vacío = sigue vigente. */
    effective_to: z.string().optional(),
  })
  // La tarifa comodín es respaldo de precio, no un modelo elegible: no va al
  // catálogo y por eso no lleva nombre visible
  .superRefine((values, ctx) => {
    if (values.model.trim() !== "*" && (!values.display_name || values.display_name.trim() === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["display_name"],
        message: "Un modelo del catálogo necesita un nombre visible",
      });
    }
    // Solo en `characters` la salida legítimamente es 0 (síntesis de voz)
    if (values.unit !== "characters" && values.output_cost_per_mtok_usd <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["output_cost_per_mtok_usd"],
        message: "Debe ser mayor que 0",
      });
    }
  });

export type PricingFormValues = z.infer<typeof pricingFormSchema>;

export const defaultPricingFormValues: PricingFormValues = {
  provider: "anthropic",
  unit: "tokens",
  model: "",
  display_name: "",
  is_default: false,
  input_cost_per_mtok_usd: 0,
  output_cost_per_mtok_usd: 0,
  cache_read_per_mtok_usd: undefined,
  margin_multiplier: 1,
  effective_from: "",
  effective_to: "",
};

/** En `characters` salida/caché no aplican, viajen lo que viajen los inputs. */
function costsFor(values: PricingFormValues): {
  input_cost_per_mtok_usd: number;
  output_cost_per_mtok_usd: number;
  cache_read_per_mtok_usd: number | null;
} {
  const chars = values.unit === "characters";
  return {
    input_cost_per_mtok_usd: values.input_cost_per_mtok_usd,
    output_cost_per_mtok_usd: chars ? 0 : values.output_cost_per_mtok_usd,
    cache_read_per_mtok_usd: chars ? null : (values.cache_read_per_mtok_usd ?? null),
  };
}

export function toCreatePricingDTO(values: PricingFormValues): CreatePricingDTO {
  const model = values.model.trim();
  return {
    provider: values.provider,
    unit: values.unit,
    model,
    ...(model === "*"
      ? {}
      : { display_name: values.display_name?.trim(), is_default: values.is_default }),
    ...costsFor(values),
    margin_multiplier: values.margin_multiplier,
    effective_from: dateInputToIso(values.effective_from),
  };
}

export function toUpdatePricingDTO(values: PricingFormValues): UpdatePricingDTO {
  return {
    // Inmutable en edición (el campo va deshabilitado): viaja tal cual porque
    // el DTO del PATCH la exige
    unit: values.unit,
    ...(values.model.trim() === "*"
      ? {}
      : { display_name: values.display_name?.trim(), is_default: values.is_default }),
    ...costsFor(values),
    // Requerido por el DTO del PATCH: siempre viaja.
    margin_multiplier: values.margin_multiplier,
    effective_to: values.effective_to ? dateInputToIso(values.effective_to) : null,
  };
}
