/**
 * Paso «Empresa» de `/comenzar`: Zod + campos declarativos para `DynamicForm`.
 *
 * Portado del wizard de alta de `/platform` (`company-step.config.tsx`), sin
 * industria (la decide el nicho en el onboarding), sin estado (siempre trial)
 * y con la **ciudad obligatoria** (decisión del dueño, 2026-09-01). País,
 * moneda y zona horaria salen del catálogo compartido `shared/data/countries`;
 * la moneda y la zona se autollenan al elegir país y viajan ocultas.
 */
import { z } from "zod";

import { COUNTRIES, countryByCode } from "@/shared/data/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  createCustomField,
  createInputField,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import type { CompanyDraft } from "@/modules/onboarding/domain/signup-draft";

export const companyStepSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de tu empresa"),
  nit: z.string().trim().min(3, "Escribe el NIT con su dígito de verificación"),
  country_code: z.string().min(2, "Elige un país"),
  city: z.string().trim().min(2, "Escribe la ciudad donde opera tu negocio"),
  timezone: z.string().min(1),
});

export type CompanyStepValues = z.infer<typeof companyStepSchema>;

export const defaultCompanyStepValues: CompanyStepValues = {
  name: "",
  nit: "",
  country_code: "CO",
  city: "",
  timezone: "America/Bogota",
};

export function companyDraftToValues(draft: CompanyDraft | null): CompanyStepValues {
  return draft ? { ...defaultCompanyStepValues, ...draft } : defaultCompanyStepValues;
}

/** `nitError`: error del backend (`identities/nit_taken`, `onboarding/nit_invalid`) inline. */
export function buildCompanyFields(nitError?: string | null): FieldConfig<CompanyStepValues>[] {
  return [
    createInputField<CompanyStepValues>("name", {
      label: "Nombre de la empresa",
      placeholder: "Como la conocen tus clientes",
      autoComplete: "organization",
    }),
    createInputField<CompanyStepValues>("nit", {
      label: "NIT",
      placeholder: "900.000.000-0",
      autoComplete: "off",
      inputProps: { inputMode: "numeric" },
      description: nitError ? (
        <span role="alert" className="text-destructive">
          {nitError}
        </span>
      ) : (
        "Con dígito de verificación. Lo usamos para identificar tu empresa al iniciar sesión."
      ),
    }),
    createCustomField<CompanyStepValues>(
      "country_code",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <Select
            value={String(value ?? "")}
            onValueChange={(code) => {
              setValue("country_code", code);
              const country = countryByCode(code);
              if (country) setValue("timezone", country.timezone);
            }}
          >
            <SelectTrigger className="w-full" aria-label="País">
              <SelectValue placeholder="Elige un país" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError() && <p className="text-destructive text-sm">{getError()}</p>}
        </div>
      ),
      {
        label: "País",
        description: "La moneda y la zona horaria se ajustan solas.",
      },
    ),
    createInputField<CompanyStepValues>("city", {
      label: "Ciudad",
      placeholder: "Ciudad principal",
      autoComplete: "address-level2",
      description: "Donde opera tu negocio. Ajusta ejemplos, zonas de entrega y agenda.",
    }),
    createInputField<CompanyStepValues>("timezone", { inputKind: "hidden" }),
  ];
}
