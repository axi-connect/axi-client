/**
 * Pantallas «Empresa» y «Ubicación» de `/comenzar`: Zod + campos declarativos
 * para `DynamicForm`.
 *
 * Portado del wizard de alta de `/platform` (`company-step.config.tsx`), sin
 * industria (la decide el nicho en el onboarding), sin estado (siempre trial)
 * y con la **ciudad obligatoria** (decisión del dueño, 2026-09-01). País,
 * moneda y zona horaria salen del catálogo compartido `shared/data/countries`;
 * la moneda y la zona se autollenan al elegir país y viajan ocultas.
 *
 * Desde el mockup v3 (2026-09-05) la empresa se pregunta en DOS pantallas —
 * cómo se llama (nombre + NIT) y dónde opera (país + ciudad)— pero sigue siendo
 * UN objeto `CompanyDraft`: cada pantalla valida su parte con un `pick` del
 * mismo schema, así el wire no cambia.
 *
 * Las etiquetas van solo para el lector de pantalla: la pregunta grande es la
 * etiqueta visible de la pantalla y el placeholder nombra cada control.
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
import { SIGNUP_INPUT_CLASS, SIGNUP_SELECT_CLASS, SrLabel } from "@/modules/onboarding/ui/signup/signup-field.styles";

export const companyStepSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de tu empresa"),
  nit: z.string().trim().min(3, "Escribe el NIT con su dígito de verificación"),
  country_code: z.string().min(2, "Elige un país"),
  city: z.string().trim().min(2, "Escribe la ciudad donde opera tu negocio"),
  timezone: z.string().min(1),
});

export type CompanyStepValues = z.infer<typeof companyStepSchema>;

/** Pantalla «Empresa»: identidad. */
export const companyIdentitySchema = companyStepSchema.pick({ name: true, nit: true });
export type CompanyIdentityValues = z.infer<typeof companyIdentitySchema>;

/** Pantalla «Ubicación»: dónde opera. */
export const companyLocationSchema = companyStepSchema.pick({ country_code: true, city: true, timezone: true });
export type CompanyLocationValues = z.infer<typeof companyLocationSchema>;

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
export function buildCompanyIdentityFields(nitError?: string | null): FieldConfig<CompanyIdentityValues>[] {
  return [
    createInputField<CompanyIdentityValues>("name", {
      label: <SrLabel>Nombre de la empresa</SrLabel>,
      placeholder: "Nombre de la empresa",
      autoComplete: "organization",
      inputProps: { className: SIGNUP_INPUT_CLASS },
    }),
    createInputField<CompanyIdentityValues>("nit", {
      label: <SrLabel>NIT</SrLabel>,
      placeholder: "NIT con dígito de verificación",
      autoComplete: "off",
      inputProps: { inputMode: "numeric", className: SIGNUP_INPUT_CLASS },
      description: nitError ? (
        <span role="alert" className="font-medium">
          {nitError}
        </span>
      ) : (
        "El NIT identifica tu empresa al iniciar sesión."
      ),
    }),
  ];
}

export function buildCompanyLocationFields(): FieldConfig<CompanyLocationValues>[] {
  return [
    createCustomField<CompanyLocationValues>(
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
            <SelectTrigger className={SIGNUP_SELECT_CLASS} aria-label="País">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError() && <p className="text-destructive text-sm font-medium">{getError()}</p>}
        </div>
      ),
      { label: <SrLabel>País</SrLabel> },
    ),
    createInputField<CompanyLocationValues>("city", {
      label: <SrLabel>Ciudad</SrLabel>,
      placeholder: "Ciudad principal",
      autoComplete: "address-level2",
      inputProps: { className: SIGNUP_INPUT_CLASS },
    }),
    createInputField<CompanyLocationValues>("timezone", { inputKind: "hidden" }),
  ];
}
