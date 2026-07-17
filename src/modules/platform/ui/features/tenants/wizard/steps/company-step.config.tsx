/**
 * Paso «Empresa» del wizard: Zod + campos declarativos para `DynamicForm`.
 * País/moneda/timezone/industria son selects (`createCustomField` + `Select`
 * compartido — DynamicForm no trae select nativo); elegir país autollenan
 * moneda y zona horaria desde el catálogo.
 */
import { z } from "zod";
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
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { COUNTRIES, countryByCode, INDUSTRIES } from "../../../../../domain/catalogs";

export const companyStepSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  nit: z.string().min(3, "NIT inválido"),
  country_code: z.string().min(2, "Elige un país"),
  currency: z.string().min(3, "Elige una moneda"),
  city: z.string().optional(),
  industry: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(["trial", "active"]),
});

export type CompanyStepValues = z.infer<typeof companyStepSchema>;

export const defaultCompanyStepValues: CompanyStepValues = {
  name: "",
  nit: "",
  country_code: "CO",
  currency: "COP",
  city: "",
  industry: "",
  timezone: "America/Bogota",
  status: "trial",
};

const CURRENCIES = [...new Map(COUNTRIES.map((c) => [c.currency, c.currencyLabel])).entries()];
const TIMEZONES = [...new Set(COUNTRIES.map((c) => c.timezone))];

/** `nitError`: error del backend (`identities/nit_taken`) inyectado inline. */
export function buildCompanyFields(nitError?: string | null): FieldConfig<CompanyStepValues>[] {
  return [
    createInputField<CompanyStepValues>("name", {
      label: "Nombre de la empresa *",
      placeholder: "Acme Corp",
      autoComplete: "off",
    }),
    createInputField<CompanyStepValues>("nit", {
      label: "NIT *",
      placeholder: "900123456",
      autoComplete: "off",
      description: nitError ? (
        <span role="alert" className="text-destructive">{nitError}</span>
      ) : undefined,
    }),
    createCustomField<CompanyStepValues>("country_code", ({ value, setValue, getError }) => (
      <div className="space-y-1">
        <Select
          value={String(value ?? "")}
          onValueChange={(code) => {
            setValue("country_code", code);
            const country = countryByCode(code);
            if (country) {
              // Autollenado por catálogo; el admin puede cambiarlos después.
              setValue("currency", country.currency);
              setValue("timezone", country.timezone);
            }
          }}
        >
          <SelectTrigger className="w-full" aria-label="País">
            <SelectValue placeholder="Elige un país" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getError() && <p className="text-sm text-destructive">{getError()}</p>}
      </div>
    ), { label: "País *" }),
    createCustomField<CompanyStepValues>("currency", ({ value, setValue, getError }) => (
      <div className="space-y-1">
        <Select value={String(value ?? "")} onValueChange={(v) => setValue("currency", v)}>
          <SelectTrigger className="w-full" aria-label="Moneda">
            <SelectValue placeholder="Elige una moneda" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getError() && <p className="text-sm text-destructive">{getError()}</p>}
      </div>
    ), { label: "Moneda *" }),
    createInputField<CompanyStepValues>("city", { label: "Ciudad", placeholder: "Bogotá" }),
    createCustomField<CompanyStepValues>("industry", ({ value, setValue }) => (
      <Select value={String(value ?? "")} onValueChange={(v) => setValue("industry", v)}>
        <SelectTrigger className="w-full" aria-label="Industria">
          <SelectValue placeholder="Elige una industria" />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRIES.map((industry) => (
            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ), { label: "Industria" }),
    createCustomField<CompanyStepValues>("timezone", ({ value, setValue }) => (
      <Select value={String(value ?? "")} onValueChange={(v) => setValue("timezone", v)}>
        <SelectTrigger className="w-full" aria-label="Zona horaria">
          <SelectValue placeholder="Zona horaria" />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map((tz) => (
            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ), { label: "Zona horaria" }),
    createCustomField<CompanyStepValues>("status", ({ value, setValue }) => (
      <Select value={String(value ?? "trial")} onValueChange={(v) => setValue("status", v as CompanyStepValues["status"])}>
        <SelectTrigger className="w-full" aria-label="Estado inicial">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="trial">Trial (recomendado)</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
        </SelectContent>
      </Select>
    ), { label: "Estado inicial" }),
  ];
}
